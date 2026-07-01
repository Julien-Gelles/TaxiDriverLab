"""
QLearningAgent: Model-free episodic Q-Learning agent for discrete MDPs.

Implements tabular Q-Learning with epsilon-greedy exploration for the Taxi-v3
environment from Gymnasium.
"""

import numpy as np


class QLearningAgent:
    """
    Q-Learning agent with epsilon-greedy policy and tabular Q-table.

    Attributes:
        state_size: Number of discrete states (e.g. 500 for Taxi-v3).
        action_size: Number of discrete actions (e.g. 6 for Taxi-v3).
        alpha: Learning rate (step size) for Q-updates.
        gamma: Discount factor for future rewards.
        epsilon: Probability of taking a random action (exploration).
    """

    def __init__(
        self,
        state_size: int,
        action_size: int,
        alpha: float = 0.1,
        gamma: float = 0.99,
        epsilon: float = 1.0,
        seed: int | None = None,
    ) -> None:
        """
        Initialize the Q-Learning agent and Q-table.

        Args:
            state_size: Size of the state space.
            action_size: Size of the action space.
            alpha: Learning rate in [0, 1].
            gamma: Discount factor in [0, 1].
            epsilon: Initial exploration probability in [0, 1].
            seed: Optional random seed for reproducibility.
        """
        self.state_size = state_size
        self.action_size = action_size
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self._rng = np.random.default_rng(seed)

        # Q-table: Q[s, a] = expected return from state s taking action a
        self.q_table = np.zeros((state_size, action_size), dtype=np.float64)
        self._last_was_exploration = False

    def choose_action(self, state: int, explore: bool = True) -> int:
        """
        Select an action using epsilon-greedy policy.

        With probability epsilon, choose a random action; otherwise choose
        the action with maximum Q-value for the current state.

        Args:
            state: Current state index (integer).
            explore: If False, always choose greedily (no exploration).
                     Used during evaluation/testing.

        Returns:
            Selected action index (integer).
        """
        if explore and self._rng.random() < self.epsilon:
            self._last_was_exploration = True
            return int(self._rng.integers(0, self.action_size))
        self._last_was_exploration = False
        return int(np.argmax(self.q_table[state, :]))

    def get_last_was_exploration(self) -> bool:
        """True if the last choose_action() was random (exploration), False if greedy (exploitation)."""
        return getattr(self, "_last_was_exploration", False)

    def update_q_value(
        self,
        state: int,
        action: int,
        reward: float,
        next_state: int,
        terminated: bool,
    ) -> None:
        """
        Perform one Q-Learning update (TD update).

        Q(s,a) <- Q(s,a) + alpha * (r + gamma * max_a' Q(s',a') - Q(s,a))
        If the episode terminated, the max over next state is 0.

        Args:
            state: Current state.
            action: Action taken.
            reward: Reward received.
            next_state: Resulting state after taking action.
            terminated: True if the episode ended (no next state value).
        """
        self._last_updated_state = state  # pour surligner la ligne en jaune dans la heatmap
        current_q = self.q_table[state, action]
        if terminated:
            target = reward
        else:
            max_next_q = np.max(self.q_table[next_state, :])
            target = reward + self.gamma * max_next_q
        self.q_table[state, action] = current_q + self.alpha * (target - current_q)

    def decay_epsilon(self, decay_rate: float, min_epsilon: float = 0.0) -> None:
        """
        Decay exploration rate (e.g. after each episode).

        epsilon <- max(min_epsilon, epsilon * decay_rate)

        Args:
            decay_rate: Multiplicative decay factor (e.g. 0.995).
            min_epsilon: Lower bound for epsilon.
        """
        self.epsilon = max(min_epsilon, self.epsilon * decay_rate)

    def set_epsilon(self, epsilon: float) -> None:
        """Set exploration rate (e.g. to 0 for evaluation)."""
        self.epsilon = epsilon

    def get_epsilon(self) -> float:
        """Return current epsilon."""
        return self.epsilon
