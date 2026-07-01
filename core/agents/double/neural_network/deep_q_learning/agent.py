import numpy as np
import random
from collections import deque

import torch
import torch.nn as nn
import torch.optim as optim


class _QNetwork(nn.Module):
    """18-dim feature vector → 6 Q-values. Architecture: 18→256→256→128→6."""

    def __init__(self, input_size: int = 18, action_size: int = 6):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_size, 256),
            nn.LeakyReLU(0.01),
            nn.Linear(256, 256),
            nn.LeakyReLU(0.01),
            nn.Linear(256, 128),
            nn.LeakyReLU(0.01),
            nn.Linear(128, action_size),
        )

    def forward(self, x):
        return self.net(x)


class DQNAgent:
    """
    Double DQN with experience replay and action masking for the 2-passenger Taxi env.

    Input: 18-dim float32 feature vector from TaxiEnvironmentSimulator.
    Uses CPU — faster than GPU for small MLP single-sample inference.
    """

    INPUT_DIM = 18
    ACTION_SPACE = 6

    def __init__(
        self,
        action_space_size: int = ACTION_SPACE,
        state_space_size: int = None,
        lr: float = 1e-3,
        gamma: float = 0.995,
        epsilon: float = 1.0,
        epsilon_decay: float = 0.995,
        epsilon_min: float = 0.02,
        batch_size: int = 128,
        memory_size: int = 50_000,
        target_update: int = 10,
        train_every: int = 4,
        **kwargs,
    ):
        self.action_space_size = action_space_size
        self.gamma = gamma
        self.epsilon = epsilon
        self.epsilon_decay = epsilon_decay
        self.epsilon_min = epsilon_min
        self.batch_size = batch_size
        self.target_update = target_update
        # Train every N steps rather than every single one (every transition
        # is still stored) — matches the original DQN paper's practice, cuts
        # training compute ~4x with no meaningful effect on learning.
        self.train_every = max(1, train_every)
        self._step_count = 0
        self._last_was_exploration = False

        self.memory: deque = deque(maxlen=memory_size)
        self.device = torch.device("cpu")

        self.policy_net = _QNetwork(self.INPUT_DIM, action_space_size).to(self.device)
        self.target_net = _QNetwork(self.INPUT_DIM, action_space_size).to(self.device)
        self.target_net.load_state_dict(self.policy_net.state_dict())
        self.target_net.eval()

        self.optimizer = optim.Adam(self.policy_net.parameters(), lr=lr)
        self.criterion = nn.SmoothL1Loss()
        self._episode_count = 0
        self._current_state = None   # latest feature vector (for live network visualisation)
        self._last_updated_state = None

    def get_action(self, state, explore: bool = True, valid_actions_mask=None, **kwargs) -> int:
        self._current_state = state
        if explore and random.random() < self.epsilon:
            self._last_was_exploration = True
            if valid_actions_mask is not None:
                valid = np.where(valid_actions_mask)[0]
                return int(random.choice(valid))
            return random.randint(0, self.action_space_size - 1)

        self._last_was_exploration = False
        with torch.no_grad():
            s = torch.tensor(state, dtype=torch.float32, device=self.device).unsqueeze(0)
            q = self.policy_net(s).squeeze(0)
            if valid_actions_mask is not None:
                mask = torch.tensor(valid_actions_mask, dtype=torch.bool, device=self.device)
                q[~mask] = -1e9
            return int(q.argmax().item())

    def update(self, state, action: int, reward: float, next_state, done: bool, **kwargs):
        next_valid_mask = kwargs.get("next_valid_mask", None)
        if next_valid_mask is None:
            next_valid_mask = np.ones(self.action_space_size, dtype=bool)
        self.memory.append((state, action, reward, next_state, done, next_valid_mask))
        self._step_count += 1

        if len(self.memory) < self.batch_size or self._step_count % self.train_every != 0:
            return None

        batch = random.sample(self.memory, self.batch_size)
        states, actions, rewards, next_states, dones, next_masks = zip(*batch)

        states_t = torch.tensor(np.array(states), dtype=torch.float32, device=self.device)
        actions_t = torch.tensor(actions, dtype=torch.long, device=self.device).unsqueeze(1)
        rewards_t = torch.tensor(rewards, dtype=torch.float32, device=self.device)
        next_states_t = torch.tensor(np.array(next_states), dtype=torch.float32, device=self.device)
        dones_t = torch.tensor(dones, dtype=torch.float32, device=self.device)
        next_masks_t = torch.tensor(np.array(next_masks), dtype=torch.bool, device=self.device)

        current_q = self.policy_net(states_t).gather(1, actions_t).squeeze(1)

        with torch.no_grad():
            next_policy_q = self.policy_net(next_states_t)
            next_policy_q[~next_masks_t] = -1e9
            next_actions = next_policy_q.argmax(1, keepdim=True)
            next_q = self.target_net(next_states_t).gather(1, next_actions).squeeze(1)
            target_q = rewards_t + (1 - dones_t) * self.gamma * next_q

        loss = self.criterion(current_q, target_q)
        self.optimizer.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(self.policy_net.parameters(), max_norm=5.0)
        self.optimizer.step()

        return {
            "loss": loss.item(),
            "q_mean": current_q.mean().item(),
            "q_max": current_q.max().item(),
            "q_min": current_q.min().item(),
        }

    def on_episode_end(self, episode: int):
        self.epsilon = max(self.epsilon_min, self.epsilon * self.epsilon_decay)
        self._episode_count += 1
        if self._episode_count % self.target_update == 0:
            self.target_net.load_state_dict(self.policy_net.state_dict())

    def decay_epsilon(self, decay_rate: float, min_epsilon: float):
        self.epsilon = max(min_epsilon, self.epsilon * decay_rate)

    def get_epsilon(self) -> float:
        return self.epsilon

    def set_epsilon(self, epsilon: float):
        self.epsilon = epsilon

    def get_last_was_exploration(self) -> bool:
        return self._last_was_exploration

    def get_activations(self, state=None) -> dict:
        """
        Per-layer activations for the live network graph.
        Architecture: 18 → 256 → 256 → 128 → 6
        Exposed layers: after layer-1 (256), after layer-5 (128), final output (6).
        """
        feat = self._current_state
        if feat is None:
            return {
                "embedding": np.zeros(256),
                "hidden": np.zeros(128),
                "output": np.zeros(self.action_space_size),
            }
        with torch.no_grad():
            x = torch.tensor(np.array(feat), dtype=torch.float32, device=self.device).unsqueeze(0)
            emb = hidden = None
            for i, layer in enumerate(self.policy_net.net):
                x = layer(x)
                if i == 1:   # after first LeakyReLU → 256 values
                    emb = x.squeeze(0).cpu().numpy().copy()
                elif i == 5: # after third LeakyReLU → 128 values
                    hidden = x.squeeze(0).cpu().numpy().copy()
            output = x.squeeze(0).cpu().numpy().copy()
        return {
            "embedding": emb if emb is not None else np.zeros(256),
            "hidden":    hidden if hidden is not None else np.zeros(128),
            "output":    output,
        }

    def get_weights(self) -> dict:
        """
        FC weight matrices for the network-graph edges.
          fc1: (128, 256)  — between first 256-node layer and 128-node layer
          fc2: (6,   128)  — between 128-node layer and output
        """
        with torch.no_grad():
            return {
                "fc1": self.policy_net.net[4].weight.cpu().numpy().copy(),
                "fc2": self.policy_net.net[6].weight.cpu().numpy().copy(),
            }

    def save(self, filepath: str):
        torch.save(self.policy_net.state_dict(), filepath)

    def load(self, filepath: str):
        self.policy_net.load_state_dict(torch.load(filepath, map_location=self.device))
        self.target_net.load_state_dict(self.policy_net.state_dict())
        self.epsilon = self.epsilon_min
