"""
MonteCarloAgent: Model-free episodic Monte Carlo agent for discrete MDPs.

Implements tabular first-visit Monte Carlo control with epsilon-greedy
exploration for the Taxi-v4 environment from Gymnasium.

Key difference from Q-Learning/SARSA: the Q-table is updated only at the
END of an episode, using the actual cumulative return G observed for each
(state, action) pair, instead of a bootstrapped (estimated) target.
"""

import numpy as np


class MonteCarloAgent:
    """
    Monte Carlo control agent with epsilon-greedy policy and tabular Q-table.

    Uses first-visit Monte Carlo: for each episode, only the first occurrence
    of a (state, action) pair is updated towards the actual return G observed
    from that point onward.

    Attributes:
        state_size: Number of discrete states (e.g. 500 for Taxi-v4).
        action_size: Number of discrete actions (e.g. 6 for Taxi-v4).
        alpha: Learning rate (step size) for the constant-alpha MC update.
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
        first_visit: bool = True,
    ) -> None:
        """
        Initialize the Monte Carlo agent and Q-table.

        Args:
            state_size: Size of the state space.
            action_size: Size of the action space.
            alpha: Learning rate in [0, 1] for the constant-alpha MC update.
            gamma: Discount factor in [0, 1].
            epsilon: Initial exploration probability in [0, 1].
            seed: Optional random seed for reproducibility.
            first_visit: If True, use first-visit MC (only update the first
                occurrence of each (s,a) pair per episode). If False, use
                every-visit MC (update every occurrence). every-visit typically
                converges faster with higher variance.
        """
        self.state_size = state_size
        self.action_size = action_size
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.first_visit = first_visit
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
        self._last_updated_state = state  # pour surligner l'état courant dans la heatmap
        if explore and self._rng.random() < self.epsilon:
            self._last_was_exploration = True
            return int(self._rng.integers(0, self.action_size))
        self._last_was_exploration = False
        return int(np.argmax(self.q_table[state, :]))

    def get_last_was_exploration(self) -> bool:
        """True if the last choose_action() was random (exploration), False if greedy (exploitation)."""
        return getattr(self, "_last_was_exploration", False)

    def update_from_episode(
        self,
        trajectory: list[tuple[int, int, float]],
        terminated: bool = True,
        last_next_state: int | None = None,
    ) -> None:
        """
        Perform Monte Carlo updates from a complete episode trajectory.

        Walks the trajectory backwards to compute the discounted return G
        for each step, then updates Q(s,a) towards G using a constant-alpha
        rule (suited to control, where the policy keeps changing):

            G_t = r_t + gamma * G_{t+1}
            Q(s,a) ← Q(s,a) + alpha * (G_t - Q(s,a))

        Bootstrap on truncation (time limit), not on true termination:
        Taxi truncates episodes at 200 steps (truncated=True, terminated=False).
        A purely-MC return would treat that cutoff as a terminal failure and inject
        fully-negative returns, freezing Q at pessimistic values. Instead — like
        Q-Learning/SARSA which only zero the future on `terminated` — we seed the
        return from the estimated value of the final state, so value still
        propagates across truncated episodes.

        With first_visit=True, only the first occurrence of each (s,a) pair
        in the episode is updated (subsequent occurrences are skipped).

        Args:
            trajectory: List of (state, action, reward) tuples in chronological
                order, as experienced during the episode.
            terminated: True if the episode reached a real terminal state.
                False means it was truncated (time limit) → bootstrap.
            last_next_state: State reached after the final action. Used to
                bootstrap the return when the episode was truncated.
        """
        # Seed the return: 0 on real termination, bootstrap V(s) on truncation.
        if terminated or last_next_state is None:
            g_return = 0.0
        else:
            g_return = float(np.max(self.q_table[last_next_state, :]))
        visited: set[tuple[int, int]] = set()
        for state, action, reward in reversed(trajectory):
            g_return = reward + self.gamma * g_return
            if self.first_visit:
                if (state, action) in visited:
                    continue
                visited.add((state, action))

            # Constant-alpha MC update: Q ← Q + alpha * (G - Q)
            current_q = self.q_table[state, action]
            self.q_table[state, action] = current_q + self.alpha * (g_return - current_q)

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
