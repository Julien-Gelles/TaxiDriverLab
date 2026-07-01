"""
DQNAgent: Deep Q-Network agent for discrete MDPs.

Replaces the tabular Q-table with a neural network that maps a state to its
Q-values. Stabilised with the two classic DQN tricks:
  - Experience Replay: store transitions in a buffer and learn from random
    mini-batches (decorrelates samples).
  - Target Network: a frozen copy of the network provides the bootstrap target,
    refreshed only every few episodes (stabilises the moving target).

Uses Double DQN: the online network picks the next action, the target network
evaluates it (reduces Q-value over-estimation).

For Taxi-v4 the state is a single integer in [0, 500), so the network starts
with an nn.Embedding layer instead of a one-hot/convolutional front-end.
"""

import random
from collections import deque

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim


class QNetwork(nn.Module):
    """
    Maps a discrete state index to Q-values for every action.

    Embedding(state) -> Linear -> ReLU -> Linear -> Q-values.
    """

    def __init__(self, state_size: int, action_size: int, embed_dim: int = 32, hidden_dim: int = 64) -> None:
        super().__init__()
        self.embedding = nn.Embedding(state_size, embed_dim)
        self.fc1 = nn.Linear(embed_dim, hidden_dim)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(hidden_dim, action_size)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.embedding(x)
        x = self.relu(self.fc1(x))
        return self.fc2(x)


class DQNAgent:
    """
    Deep Q-Network agent with epsilon-greedy policy, experience replay and a
    target network. Exposes the same interface as the tabular agents
    (choose_action / decay_epsilon / get_epsilon / ...) so it plugs into the
    project's training and rendering loop.

    Attributes:
        state_size: Number of discrete states (e.g. 500 for Taxi-v4).
        action_size: Number of discrete actions (e.g. 6 for Taxi-v4).
        gamma: Discount factor for future rewards.
        epsilon: Probability of taking a random action (exploration).
    """

    def __init__(
        self,
        state_size: int,
        action_size: int,
        lr: float = 1e-3,
        gamma: float = 0.99,
        epsilon: float = 1.0,
        seed: int | None = None,
        batch_size: int = 64,
        memory_size: int = 10000,
        target_update: int = 10,
        train_every: int = 4,
    ) -> None:
        """
        Initialize the DQN agent (networks, optimizer, replay buffer).

        Args:
            state_size: Size of the state space.
            action_size: Size of the action space.
            lr: Learning rate for the Adam optimizer.
            gamma: Discount factor in [0, 1].
            epsilon: Initial exploration probability in [0, 1].
            seed: Optional random seed for reproducibility.
            batch_size: Mini-batch size sampled from the replay buffer.
            memory_size: Maximum number of transitions kept in the buffer.
            target_update: Refresh the target network every N episodes.
            train_every: Run a gradient step every N environment steps
                (every transition is still stored). Matches the original
                DQN paper's practice of training every 4 steps rather than
                every single one — cuts training compute ~4x with no
                meaningful effect on learning, since it only thins out how
                often the *same* replay buffer gets sampled.
        """
        self.state_size = state_size
        self.action_size = action_size
        self.gamma = gamma
        self.epsilon = epsilon
        self.batch_size = batch_size
        self.target_update = target_update
        self.train_every = max(1, train_every)
        self._step_count = 0

        if seed is not None:
            random.seed(seed)
            np.random.seed(seed)
            torch.manual_seed(seed)

        # Small model: CPU is faster than GPU here (per-sample transfer overhead).
        self.device = torch.device("cpu")

        self.policy_net = QNetwork(state_size, action_size).to(self.device)
        self.target_net = QNetwork(state_size, action_size).to(self.device)
        self.target_net.load_state_dict(self.policy_net.state_dict())
        self.target_net.eval()  # target net is never trained directly

        self.optimizer = optim.Adam(self.policy_net.parameters(), lr=lr)
        self.criterion = nn.MSELoss()

        self.memory: deque = deque(maxlen=memory_size)
        self._episode_count = 0
        self._last_was_exploration = False
        self._current_state = 0  # latest state seen (for the live visualisation)

    def choose_action(self, state: int, explore: bool = True) -> int:
        """
        Select an action using epsilon-greedy over the network's Q-values.

        Args:
            state: Current state index (integer).
            explore: If False, always choose greedily (evaluation).

        Returns:
            Selected action index (integer).
        """
        self._current_state = state
        # Row to highlight in the reconstructed Q heatmap ("you are here").
        self._last_updated_state = state
        if explore and random.random() < self.epsilon:
            self._last_was_exploration = True
            return random.randint(0, self.action_size - 1)
        self._last_was_exploration = False
        with torch.no_grad():
            state_tensor = torch.tensor([state], dtype=torch.long, device=self.device)
            q_values = self.policy_net(state_tensor)
            return int(q_values.argmax().item())

    def get_last_was_exploration(self) -> bool:
        """True if the last choose_action() was random (exploration)."""
        return getattr(self, "_last_was_exploration", False)

    def observe(
        self,
        state: int,
        action: int,
        reward: float,
        next_state: int,
        done: bool,
    ) -> None:
        """
        Store one transition in the replay buffer and run a learning step.

        Args:
            state: Current state.
            action: Action taken.
            reward: Reward received.
            next_state: Resulting state.
            done: True if the episode ended (terminated OR truncated).
        """
        self.memory.append((state, action, reward, next_state, done))
        self._step_count += 1
        if self._step_count % self.train_every == 0:
            self._learn()

    def _learn(self) -> None:
        """Sample a random mini-batch and take one gradient step (Double DQN)."""
        if len(self.memory) < self.batch_size:
            return

        batch = random.sample(self.memory, self.batch_size)
        states, actions, rewards, next_states, dones = zip(*batch)

        states = torch.tensor(states, dtype=torch.long, device=self.device)
        actions = torch.tensor(actions, dtype=torch.long, device=self.device).unsqueeze(1)
        rewards = torch.tensor(rewards, dtype=torch.float32, device=self.device)
        next_states = torch.tensor(next_states, dtype=torch.long, device=self.device)
        dones = torch.tensor(dones, dtype=torch.float32, device=self.device)

        # Q(s,a) predicted by the online network for the actions actually taken.
        current_q = self.policy_net(states).gather(1, actions).squeeze(1)

        # Double DQN target: online net picks the action, target net scores it.
        with torch.no_grad():
            best_next_actions = self.policy_net(next_states).argmax(1, keepdim=True)
            max_next_q = self.target_net(next_states).gather(1, best_next_actions).squeeze(1)
            target_q = rewards + (1.0 - dones) * self.gamma * max_next_q

        loss = self.criterion(current_q, target_q)
        self.optimizer.zero_grad()
        loss.backward()
        self.optimizer.step()

    def end_episode(self) -> None:
        """Refresh the target network every `target_update` episodes."""
        self._episode_count += 1
        if self._episode_count % self.target_update == 0:
            self.target_net.load_state_dict(self.policy_net.state_dict())

    def decay_epsilon(self, decay_rate: float, min_epsilon: float = 0.0) -> None:
        """epsilon <- max(min_epsilon, epsilon * decay_rate)."""
        self.epsilon = max(min_epsilon, self.epsilon * decay_rate)

    def set_epsilon(self, epsilon: float) -> None:
        """Set exploration rate (e.g. to 0 for evaluation)."""
        self.epsilon = epsilon

    def get_epsilon(self) -> float:
        """Return current epsilon."""
        return self.epsilon

    @property
    def q_table(self) -> np.ndarray:
        """
        Reconstruct a full Q-table by forwarding every state through the network.

        Returns an array of shape (state_size, action_size). This lets the pygame
        heatmap visualise a DQN exactly like a tabular agent — the "table" the
        network represents, computed on the fly.
        """
        with torch.no_grad():
            all_states = torch.arange(self.state_size, dtype=torch.long, device=self.device)
            return self.policy_net(all_states).cpu().numpy()

    def get_activations(self, state: int) -> dict[str, np.ndarray]:
        """
        Return the per-layer activations of the network for a single state.

        Used by the live visualisation to show the network "thinking":
          - embedding: output of the Embedding layer (32 values)
          - hidden:    output of fc1 + ReLU (64 values)
          - output:    the 6 Q-values (one per action)
        """
        with torch.no_grad():
            s = torch.tensor([state], dtype=torch.long, device=self.device)
            emb = self.policy_net.embedding(s)
            hidden = self.policy_net.relu(self.policy_net.fc1(emb))
            output = self.policy_net.fc2(hidden)
            return {
                "embedding": emb.squeeze(0).cpu().numpy(),
                "hidden": hidden.squeeze(0).cpu().numpy(),
                "output": output.squeeze(0).cpu().numpy(),
            }

    def get_weights(self) -> dict[str, np.ndarray]:
        """
        Return the linear-layer weight matrices, for the network-graph view.

        Each matrix is (target_neurons, source_neurons):
          - fc1: (hidden=64, embedding=32) — edges Embedding → Hidden
          - fc2: (output=6, hidden=64)     — edges Hidden → Output
        """
        with torch.no_grad():
            return {
                "fc1": self.policy_net.fc1.weight.cpu().numpy().copy(),
                "fc2": self.policy_net.fc2.weight.cpu().numpy().copy(),
            }
