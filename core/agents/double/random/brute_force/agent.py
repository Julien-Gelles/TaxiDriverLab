import numpy as np


class RandomAgent:
    """
    Baseline agent that picks random valid actions. No learning.
    """

    def __init__(self, action_space_size: int = 6, **kwargs):
        self.action_space_size = action_space_size
        self._last_was_exploration = True

    def get_action(self, state, explore: bool = True, valid_actions_mask=None, **kwargs) -> int:
        self._last_was_exploration = True
        if valid_actions_mask is not None:
            valid = np.where(valid_actions_mask)[0]
            if len(valid) > 0:
                return int(np.random.choice(valid))
        return int(np.random.randint(self.action_space_size))

    def update(self, state, action, reward, next_state, done, **kwargs):
        pass

    def on_episode_end(self, episode: int):
        pass

    def get_epsilon(self) -> float:
        return 1.0

    def get_last_was_exploration(self) -> bool:
        return self._last_was_exploration
