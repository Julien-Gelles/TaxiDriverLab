import numpy as np
from collections import deque


class HeuristicAgent:
    """
    Optimal deterministic FSM agent for the 2-passenger Taxi environment (capacity=1).

    Strategy: BFS navigation + optimal pickup-order planning.

    Phase sequence:
      PLAN  → choose best pickup order (P1-first vs P2-first by BFS cost)
      PH1   → navigate to first passenger
      PH1_P → pickup
      PH2   → navigate to first passenger's destination
      PH2_D → dropoff
      PH3   → navigate to second passenger
      PH3_P → pickup
      PH4   → navigate to second passenger's destination
      PH4_D → dropoff
    """

    LOCS = [(0, 0), (0, 4), (4, 0), (4, 3)]
    ROWS = 5
    COLS = 5

    _WALLS = frozenset({
        ((0, 1), (0, 2)), ((1, 1), (1, 2)), ((2, 1), (2, 2)),
        ((3, 0), (3, 1)), ((4, 0), (4, 1)),
        ((3, 2), (3, 3)), ((4, 2), (4, 3)),
    })

    def __init__(self, action_space_size: int = 6, **kwargs):
        self.action_space_size = action_space_size
        self._adj = self._build_adj()
        self._order = []
        self._phase = 0

    # ------------------------------------------------------------------ #
    #  Grid helpers                                                        #
    # ------------------------------------------------------------------ #

    @classmethod
    def _wall_between(cls, a, b):
        if a[1] > b[1]:
            a, b = b, a
        return (a, b) in cls._WALLS

    def _build_adj(self):
        adj = {}
        for r in range(self.ROWS):
            for c in range(self.COLS):
                nbrs = []
                if r < 4: nbrs.append((0, (r + 1, c)))
                if r > 0: nbrs.append((1, (r - 1, c)))
                if c < 4 and not self._wall_between((r, c), (r, c + 1)):
                    nbrs.append((2, (r, c + 1)))
                if c > 0 and not self._wall_between((r, c), (r, c - 1)):
                    nbrs.append((3, (r, c - 1)))
                adj[(r, c)] = nbrs
        return adj

    def _bfs_next(self, src, dst):
        if src == dst:
            return None
        frontier = deque([(src, None)])
        visited = {src}
        while frontier:
            cell, first_action = frontier.popleft()
            for action, nxt in self._adj[cell]:
                if nxt == dst:
                    return first_action if first_action is not None else action
                if nxt not in visited:
                    visited.add(nxt)
                    frontier.append((nxt, first_action if first_action is not None else action))
        return 0

    def _bfs_cost(self, src, dst):
        if src == dst:
            return 0
        frontier = deque([(src, 0)])
        visited = {src}
        while frontier:
            cell, dist = frontier.popleft()
            for _, nxt in self._adj[cell]:
                if nxt == dst:
                    return dist + 1
                if nxt not in visited:
                    visited.add(nxt)
                    frontier.append((nxt, dist + 1))
        return 999

    # ------------------------------------------------------------------ #
    #  Planning                                                            #
    # ------------------------------------------------------------------ #

    def _plan(self, taxi_pos, p1_loc, p1_dest, p2_loc, p2_dest):
        pos1, dst1 = self.LOCS[p1_loc], self.LOCS[p1_dest]
        pos2, dst2 = self.LOCS[p2_loc], self.LOCS[p2_dest]
        cost_p1 = (self._bfs_cost(taxi_pos, pos1) + self._bfs_cost(pos1, dst1) +
                   self._bfs_cost(dst1, pos2) + self._bfs_cost(pos2, dst2))
        cost_p2 = (self._bfs_cost(taxi_pos, pos2) + self._bfs_cost(pos2, dst2) +
                   self._bfs_cost(dst2, pos1) + self._bfs_cost(pos1, dst1))
        return [1, 2] if cost_p1 <= cost_p2 else [2, 1]

    # ------------------------------------------------------------------ #
    #  FSM helpers                                                         #
    # ------------------------------------------------------------------ #

    def _p_loc(self, env, idx):
        return env.env.p1_loc if idx == 1 else env.env.p2_loc

    def _p_dest(self, env, idx):
        return env.env.p1_dest if idx == 1 else env.env.p2_dest

    def reset_episode(self):
        self._phase = 0
        self._order = []

    # ------------------------------------------------------------------ #
    #  Action selection                                                    #
    # ------------------------------------------------------------------ #

    def get_action(self, state, explore: bool = False, env=None, **kwargs) -> int:
        if env is None:
            return int(np.random.randint(4))

        taxi_pos = (env.env.taxi_row, env.env.taxi_col)
        p1_loc, p1_dest = env.env.p1_loc, env.env.p1_dest
        p2_loc, p2_dest = env.env.p2_loc, env.env.p2_dest

        if self._phase == 0:
            if p1_loc == 5 and p2_loc == 5:
                return 0
            if p1_loc == 5:
                self._order = [2, None]; self._phase = 3
            elif p2_loc == 5:
                self._order = [1, None]; self._phase = 1
            elif p1_loc == 4:
                self._order = [1, 2]; self._phase = 2
            elif p2_loc == 4:
                self._order = [2, 1]; self._phase = 4
            else:
                self._order = self._plan(taxi_pos, p1_loc, p1_dest, p2_loc, p2_dest)
                self._phase = 1

        first = self._order[0] if len(self._order) > 0 else None
        second = self._order[1] if len(self._order) > 1 else None
        taxi_pos = (env.env.taxi_row, env.env.taxi_col)

        if self._phase == 1 and first is not None:
            loc = self._p_loc(env, first)
            if loc == 4:
                self._phase = 2
            elif loc == 5:
                self._phase = 3
            else:
                target = self.LOCS[loc]
                if taxi_pos == target:
                    self._phase = 2
                    return 4
                return self._bfs_next(taxi_pos, target)

        if self._phase == 2 and first is not None:
            loc = self._p_loc(env, first)
            dest = self._p_dest(env, first)
            if loc == 5:
                self._phase = 3
            elif loc != 4:
                self._phase = 1
                return self._bfs_next(taxi_pos, self.LOCS[loc])
            else:
                target = self.LOCS[dest]
                if taxi_pos == target:
                    self._phase = 3
                    return 5
                return self._bfs_next(taxi_pos, target)

        if self._phase == 3 and second is not None:
            loc = self._p_loc(env, second)
            if loc == 4:
                self._phase = 4
            elif loc == 5:
                return 0
            else:
                target = self.LOCS[loc]
                if taxi_pos == target:
                    self._phase = 4
                    return 4
                return self._bfs_next(taxi_pos, target)

        if self._phase == 4 and second is not None:
            loc = self._p_loc(env, second)
            dest = self._p_dest(env, second)
            if loc == 5:
                return 0
            elif loc != 4:
                self._phase = 3
                return self._bfs_next(taxi_pos, self.LOCS[loc])
            else:
                target = self.LOCS[dest]
                if taxi_pos == target:
                    return 5
                return self._bfs_next(taxi_pos, target)

        return 0

    def update(self, state, action, reward, next_state, done, **kwargs):
        if done:
            self.reset_episode()

    def on_episode_end(self, episode: int):
        self.reset_episode()

    def get_epsilon(self) -> float:
        return 0.0

    def get_last_was_exploration(self) -> bool:
        return False
