import numpy as np
import random


class MonteCarloAgent:
    """
    First-visit Monte Carlo for the 2-passenger Taxi environment.
    Buffers the full episode and updates Q-values from actual returns at episode end.
    State space: 14 400 (5×5×6×4×6×4).
    """

    STATE_SPACE = 14_400
    ACTION_SPACE = 6

    def __init__(
        self,
        state_space_size: int = STATE_SPACE,
        action_space_size: int = ACTION_SPACE,
        alpha: float = 0.1,
        gamma: float = 0.99,
        epsilon: float = 1.0,
        epsilon_min: float = 0.01,
        **kwargs,
    ):
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.epsilon_min = epsilon_min
        self.action_space_size = action_space_size

        self.q_table = np.zeros((state_space_size, action_space_size))
        self._episode_buffer: list = []
        self._last_was_exploration = False

    def get_action(self, state: int, explore: bool = True, valid_actions_mask=None, **kwargs) -> int:
        if explore and random.random() < self.epsilon:
            self._last_was_exploration = True
            if valid_actions_mask is not None:
                valid = np.where(valid_actions_mask)[0]
                if len(valid) > 0:
                    return int(random.choice(valid))
            return random.randint(0, self.action_space_size - 1)

        self._last_was_exploration = False
        q = self.q_table[state].copy()
        if valid_actions_mask is not None:
            q[~valid_actions_mask] = -np.inf
        return int(np.argmax(q))

    def update(self, state: int, action: int, reward: float, next_state: int, done: bool, **kwargs):
        self._last_updated_state = state  # pour surligner l'état courant dans la heatmap
        self._episode_buffer.append((state, action, reward))

    def on_episode_end(self, episode: int):
        G = 0.0
        returns = []
        for state, action, reward in reversed(self._episode_buffer):
            G = self.gamma * G + reward
            returns.append((state, action, G))
        returns.reverse()

        visited = set()
        for state, action, G_val in returns:
            if (state, action) not in visited:
                visited.add((state, action))
                self.q_table[state, action] += self.alpha * (G_val - self.q_table[state, action])

        self._episode_buffer = []
        self.epsilon = max(self.epsilon_min, self.epsilon * 0.995)

    def decay_epsilon(self, decay_rate: float, min_epsilon: float):
        self.epsilon = max(min_epsilon, self.epsilon * decay_rate)

    def get_epsilon(self) -> float:
        return self.epsilon

    def set_epsilon(self, epsilon: float):
        self.epsilon = epsilon

    def get_last_was_exploration(self) -> bool:
        return self._last_was_exploration
