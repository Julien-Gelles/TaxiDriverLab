import gymnasium as gym
from gymnasium import spaces
import numpy as np

class MultiPassengerTaxiEnv(gym.Env):
    """
    A unified custom environment for Multi-Passenger Taxi.
    Expands Taxi-v4 to have 2 passengers simultaneously.

    Key design rules (Applied RL approach):
      - Capacity = 1: the taxi can carry only one passenger at a time.
        This forces a strict pickup→dropoff→pickup→dropoff sequence.
      - Action Masking: get_valid_actions() exposes illegal actions so the
        agent (or a wrapper) can mask them before argmax, saving the network
        from learning what is physically impossible.
      - Clean rewards: no distance-based shaping.  Events only.
    """
    metadata = {"render_modes": ["human", "ansi", "rgb_array"], "render_fps": 4}

    def __init__(self, render_mode=None, max_steps=400):
        self.max_steps = int(max_steps)
        self.desc = np.asarray([
            "+---------+",
            "|R: | : :G|",
            "| : | : : |",
            "| : : : : |",
            "| | : | : |",
            "|Y| : |B: |",
            "+---------+",
        ], dtype="c")

        self.locs = [(0, 0), (0, 4), (4, 0), (4, 3)]
        self.locs_colors = [(255, 0, 0), (0, 255, 0), (255, 255, 0), (0, 0, 255)]

        # Actions: 0: South, 1: North, 2: East, 3: West, 4: Pickup, 5: Dropoff
        self.action_space = spaces.Discrete(6)

        # States: taxi_row(5), taxi_col(5), p1_loc(6), p1_dest(4), p2_loc(6), p2_dest(4)
        # Location: 0,1,2,3 for R,G,Y,B; 4 for in taxi; 5 for delivered
        self.observation_space = spaces.Discrete(5 * 5 * 6 * 4 * 6 * 4)

        self.render_mode = render_mode
        self.s = 0
        self.lastaction = None
        self.current_step = 0

        self.taxi_row = 0
        self.taxi_col = 0
        self.p1_loc = 0
        self.p1_dest = 1

        self.p2_loc = 2
        self.p2_dest = 3

        # pygame utils
        self.window = None
        self.clock = None
        WINDOW_SIZE = (550, 350)
        self.cell_size = (
            WINDOW_SIZE[0] / self.desc.shape[1],
            WINDOW_SIZE[1] / self.desc.shape[0],
        )
        self.taxi_imgs = None
        self.taxi_orientation = 0
        self.passenger_img = None
        self.passenger2_img = None
        self.destination_img = None
        self.destination2_img = None
        self.median_horiz = None
        self.median_vert = None
        self.background_img = None

    def encode(self, taxi_row, taxi_col, p1_loc, p1_dest, p2_loc, p2_dest):
        i = taxi_row
        i *= 5; i += taxi_col
        i *= 6; i += p1_loc
        i *= 4; i += p1_dest
        i *= 6; i += p2_loc
        i *= 4; i += p2_dest
        return i

    def decode(self, i):
        out = []
        out.append(i % 4); i //= 4
        out.append(i % 6); i //= 6
        out.append(i % 4); i //= 4
        out.append(i % 6); i //= 6
        out.append(i % 5); i //= 5
        out.append(i)
        assert 0 <= i < 5
        return list(reversed(out))

    def reset(self, seed=None, curriculum_stage=None):
        """
        Reset the environment.

        curriculum_stage controls the difficulty for curriculum learning:
          None / 3 : Standard full mission (2 passengers, random positions)
          1         : Pickup school — taxi spawns ≤ 3 Manhattan steps from P1,
                      P2 is pre-delivered (p2_loc=5) so only P1 matters.
          2         : Delivery school — P1 already in taxi (p1_loc=4),
                      taxi must navigate to P1's destination.
        """
        if seed is not None:
            np.random.seed(seed)

        self.current_step = 0

        available_locs = list(range(4))
        np.random.shuffle(available_locs)
        self.p1_loc = available_locs[0]
        self.p1_dest = available_locs[1]
        self.p2_loc = available_locs[2]
        self.p2_dest = available_locs[3]

        if curriculum_stage == 1:
            # Stage 1: Pickup school
            p1_row, p1_col = self.locs[self.p1_loc]
            while True:
                r = np.random.randint(5)
                c = np.random.randint(5)
                if abs(r - p1_row) + abs(c - p1_col) <= 3:
                    self.taxi_row, self.taxi_col = r, c
                    break
            self.p2_loc = 5   # P2 already delivered — ignore it
            self.p2_dest = available_locs[3]

        elif curriculum_stage == 2:
            # Stage 2: Delivery school
            # P1 is already in the taxi — the agent only needs to learn: navigate → dropoff.
            self.taxi_row = np.random.randint(5)
            self.taxi_col = np.random.randint(5)
            self.p1_loc = 4   # P1 already boarded
            self.p2_loc = 5   # P2 already delivered — ignore it

        else:
            # Stage 3 / None: Full mission — both passengers, fully random start
            self.taxi_row = np.random.randint(5)
            self.taxi_col = np.random.randint(5)

        self.s = self.encode(self.taxi_row, self.taxi_col, self.p1_loc, self.p1_dest, self.p2_loc, self.p2_dest)
        self.lastaction = None
        return self.get_features(), {"prob": 1.0}


    def get_valid_actions(self):
        """
        Returns a boolean mask of shape (6,) where True means the action is legal.

        Masking rules:
          - Move (0-3): illegal if it would leave the grid OR hit a wall.
          - Pickup  (4): illegal if no passenger is on the current cell,
                         OR if the taxi is already carrying someone (capacity = 1).
          - Dropoff (5): illegal if the taxi is empty,
                         OR the current cell is not the destination of the passenger in taxi.
        """
        mask = np.ones(6, dtype=bool)

        r, c = self.taxi_row, self.taxi_col

        # --- Movement masks ---
        # South (0): blocked if at bottom row
        if r >= 4:
            mask[0] = False
        # North (1): blocked if at top row
        if r <= 0:
            mask[1] = False
        # East (2): blocked if at rightmost column OR wall to the east
        if c >= 4 or self.desc[1 + r, 2 * c + 2] != b":":
            mask[2] = False
        # West (3): blocked if at leftmost column OR wall to the west
        if c <= 0 or self.desc[1 + r, 2 * c] != b":":
            mask[3] = False

        # --- Pickup mask (4) ---
        taxi_full = (self.p1_loc == 4) or (self.p2_loc == 4)
        passenger_here = (
            (self.p1_loc < 4 and self.locs[self.p1_loc] == (r, c)) or
            (self.p2_loc < 4 and self.locs[self.p2_loc] == (r, c))
        )
        if taxi_full or not passenger_here:
            mask[4] = False

        # --- Dropoff mask (5) ---
        if self.p1_loc == 4:
            # P1 is in the taxi: legal dropoff only at P1's destination
            if self.locs[self.p1_dest] != (r, c):
                mask[5] = False
        elif self.p2_loc == 4:
            # P2 is in the taxi: legal dropoff only at P2's destination
            if self.locs[self.p2_dest] != (r, c):
                mask[5] = False
        else:
            # Taxi is empty: no legal dropoff
            mask[5] = False

        return mask


    def get_features(self):
        """
        Returns a 18-dimensional float32 feature vector for the DQN.

        Layout:
          [0-1]  taxi_row/4, taxi_col/4
          [2-5]  P1 geometric: p1_r, p1_c, p1_dest_r, p1_dest_c  (all /4)
          [6-9]  P2 geometric: p2_r, p2_c, p2_dest_r, p2_dest_c  (all /4)
          [10]   p1_in_taxi   (bool 0/1)
          [11]   p1_delivered (bool 0/1)
          [12]   p2_in_taxi   (bool 0/1)
          [13]   p2_delivered (bool 0/1)
          [14]   n_in_taxi / 1.0  (load: 0, 0.5 or 1.0 — normalized)
          [15]   phase_pickup_p1: 1 if P1 is the next pickup target, else 0
          [16]   phase_pickup_p2: 1 if P2 is the next pickup target, else 0
          [17]   steps_norm: current_step / 400  (temporal pressure signal)

        Rationale for 18 dims vs previous 14:
          The 4 explicit binary flags (10-13) are isolated from the geometric
          features so the network can directly "switch" its weights from one
          objective to another without interference.  The phase signals (15-16)
          give an unambiguous target cue that the network previously had to
          infer implicitly from the continuous coordinates alone.
        """
        LOCS = [(0, 0), (0, 4), (4, 0), (4, 3)]
        t_r = self.taxi_row / 4.0
        t_c = self.taxi_col / 4.0

        # --- P1 ---
        p1_in_taxi   = float(self.p1_loc == 4)
        p1_delivered = float(self.p1_loc == 5)
        if self.p1_loc < 4:
            p1_r = LOCS[self.p1_loc][0] / 4.0
            p1_c = LOCS[self.p1_loc][1] / 4.0
        else:
            p1_r, p1_c = t_r, t_c   # taxi position when aboard/delivered

        p1_dest_r = LOCS[self.p1_dest][0] / 4.0
        p1_dest_c = LOCS[self.p1_dest][1] / 4.0

        # --- P2 ---
        p2_in_taxi   = float(self.p2_loc == 4)
        p2_delivered = float(self.p2_loc == 5)
        if self.p2_loc < 4:
            p2_r = LOCS[self.p2_loc][0] / 4.0
            p2_c = LOCS[self.p2_loc][1] / 4.0
        else:
            p2_r, p2_c = t_r, t_c

        p2_dest_r = LOCS[self.p2_dest][0] / 4.0
        p2_dest_c = LOCS[self.p2_dest][1] / 4.0

        # --- Derived signals ---
        n_in_taxi = (p1_in_taxi + p2_in_taxi)   # 0, 1 (capacity = 1)

        # Phase: who should the taxi pick up next?
        # — If taxi is empty, target the first undelivered passenger
        # — If taxi is carrying someone, phase signals = 0 (focus on dropoff)
        if n_in_taxi == 0:
            phase_pickup_p1 = float(self.p1_loc < 4)    # P1 still waiting
            phase_pickup_p2 = float(self.p2_loc < 4 and self.p1_loc == 5)  # P2 after P1 done
        else:
            phase_pickup_p1 = 0.0
            phase_pickup_p2 = 0.0

        steps_norm = min(self.current_step / float(self.max_steps), 1.0)

        return np.array([
            t_r, t_c,
            p1_r, p1_c, p1_dest_r, p1_dest_c,
            p2_r, p2_c, p2_dest_r, p2_dest_c,
            p1_in_taxi, p1_delivered,
            p2_in_taxi, p2_delivered,
            n_in_taxi,
            phase_pickup_p1, phase_pickup_p2,
            steps_norm,
        ], dtype=np.float32)


    def step(self, a):
        """
        Reward design (clean, no distance shaping):
          -1   per step       (temporal pressure)
          +10  successful pickup
          +20  successful dropoff
          +40  mission complete bonus (added on top of last dropoff)
          -10  invalid pickup or dropoff

        Capacity rule: only 1 passenger at a time.
        """
        reward = -1
        true_reward = -1
        done = False
        info = {
            "prob": 1.0,
            "true_reward": -1,
            "successful_pickup": False,
            "successful_dropoff": False,
            "invalid_action": False,
        }

        taxi_row, taxi_col = self.taxi_row, self.taxi_col
        p1_loc, p1_dest = self.p1_loc, self.p1_dest
        p2_loc, p2_dest = self.p2_loc, self.p2_dest

        if a == 0:    # South
            if taxi_row < 4: taxi_row += 1
        elif a == 1:  # North
            if taxi_row > 0: taxi_row -= 1
        elif a == 2:  # East
            if taxi_col < 4 and self.desc[1 + taxi_row, 2 * taxi_col + 2] == b":":
                taxi_col += 1
        elif a == 3:  # West
            if taxi_col > 0 and self.desc[1 + taxi_row, 2 * taxi_col] == b":":
                taxi_col -= 1

        elif a == 4:  # Pickup — capacity = 1
            taxi_full = (p1_loc == 4) or (p2_loc == 4)
            if taxi_full:
                # Taxi already carrying someone: illegal
                reward = -10
                true_reward = -10
                info["invalid_action"] = True
            else:
                picked = False
                if p1_loc < 4 and self.locs[p1_loc] == (taxi_row, taxi_col):
                    p1_loc = 4
                    picked = True
                elif p2_loc < 4 and self.locs[p2_loc] == (taxi_row, taxi_col):
                    p2_loc = 4
                    picked = True

                if picked:
                    reward = 10
                    true_reward = 10
                    info["successful_pickup"] = True
                else:
                    reward = -10
                    true_reward = -10
                    info["invalid_action"] = True

        elif a == 5:  # Dropoff
            dropped = False
            if p1_loc == 4 and self.locs[p1_dest] == (taxi_row, taxi_col):
                p1_loc = 5
                dropped = True
            elif p2_loc == 4 and self.locs[p2_dest] == (taxi_row, taxi_col):
                p2_loc = 5
                dropped = True

            if dropped:
                reward = 20
                true_reward = 20
                info["successful_dropoff"] = True
                if p1_loc == 5 and p2_loc == 5:
                    done = True
                    reward += 40          # Mission-complete bonus
                    true_reward += 40
            else:
                reward = -10
                true_reward = -10
                info["invalid_action"] = True

        # --- Reward Shaping (Dense Reward) ---
        # Instead of just default -1, we add distance-based shaping
        # We only shape if it wasn't a pickup/dropoff or error
        if reward == -1:
            # Determine current target
            if p1_loc < 4:
                target_r, target_c = self.locs[p1_loc] # Go to P1
            elif p1_loc == 4:
                target_r, target_c = self.locs[p1_dest] # Deliver P1
            elif p2_loc < 4:
                target_r, target_c = self.locs[p2_loc] # Go to P2
            elif p2_loc == 4:
                target_r, target_c = self.locs[p2_dest] # Deliver P2
            else:
                target_r, target_c = taxi_row, taxi_col # Done
            
            # Manhattan distance to current target
            dist = abs(taxi_row - target_r) + abs(taxi_col - target_c)
            # Shaping: we want distance to be small. 
            # -1 base step penalty minus a small fraction of the distance
            reward = -1 - (dist * 0.1)

        self.taxi_row, self.taxi_col = taxi_row, taxi_col
        self.p1_loc, self.p1_dest = p1_loc, p1_dest
        self.p2_loc, self.p2_dest = p2_loc, p2_dest

        self.s = self.encode(taxi_row, taxi_col, p1_loc, p1_dest, p2_loc, p2_dest)
        self.lastaction = a

        self.current_step += 1
        truncated = self.current_step >= self.max_steps
        info["true_reward"] = true_reward

        return self.get_features(), reward, done, truncated, info


    def render(self):
        if self.render_mode is None:
            gym.logger.warn("You are calling render method without specifying any render mode.")
            return
        elif self.render_mode == "ansi":
            return self._render_ansi()
        else:
            return self._render_gui(self.render_mode)

    def _render_ansi(self):

        desc = self.desc.copy().tolist()
        from io import StringIO
        from gymnasium import utils
        outfile = StringIO()

        out = [[c.decode("utf-8") for c in line] for line in desc]

        def ul(x):
            return "_" if x == " " else x

        # Passenger 1
        if self.p1_loc < 4:
            pi, pj = self.locs[self.p1_loc]
            out[1 + pi][2 * pj + 1] = utils.colorize(
                out[1 + pi][2 * pj + 1], "blue", bold=True
            )

        # Passenger 2
        if self.p2_loc < 4:
            pi, pj = self.locs[self.p2_loc]
            out[1 + pi][2 * pj + 1] = utils.colorize(
                out[1 + pi][2 * pj + 1], "cyan", bold=True
            )

        # Taxi
        if self.p1_loc == 4 or self.p2_loc == 4:
            out[1 + self.taxi_row][2 * self.taxi_col + 1] = utils.colorize(
                ul(out[1 + self.taxi_row][2 * self.taxi_col + 1]), "green", highlight=True
            )
        else:
            out[1 + self.taxi_row][2 * self.taxi_col + 1] = utils.colorize(
                out[1 + self.taxi_row][2 * self.taxi_col + 1], "yellow", highlight=True
            )

        # Destinations
        di1, dj1 = self.locs[self.p1_dest]
        out[1 + di1][2 * dj1 + 1] = utils.colorize(out[1 + di1][2 * dj1 + 1], "magenta")

        di2, dj2 = self.locs[self.p2_dest]
        out[1 + di2][2 * dj2 + 1] = utils.colorize(out[1 + di2][2 * dj2 + 1], "red")

        outfile.write("\n".join(["".join(row) for row in out]) + "\n")
        if self.lastaction is not None:
            outfile.write(
                f"  ({['South', 'North', 'East', 'West', 'Pickup', 'Dropoff'][self.lastaction]})\n"
            )
        else:
            outfile.write("\n")

        out_str = outfile.getvalue()
        outfile.close()

        return out_str

    def _render_gui(self, mode):
        from os import path
        import gymnasium as gym
        import gymnasium.envs.toy_text.taxi
        from gymnasium.error import DependencyNotInstalled

        try:
            import pygame
        except ImportError as e:
            raise DependencyNotInstalled('pygame is not installed') from e

        WINDOW_SIZE = (550, 350)
        
        if self.window is None:
            pygame.init()
            pygame.display.set_caption("Taxi Multi-Passenger")
            if mode == "human":
                self.window = pygame.display.set_mode(WINDOW_SIZE)
            elif mode == "rgb_array":
                self.window = pygame.Surface(WINDOW_SIZE)

        if self.clock is None:
            self.clock = pygame.time.Clock()
            
        if self.taxi_imgs is None:
            taxi_dir = path.join(path.dirname(gym.envs.toy_text.taxi.__file__), "img")
            file_names = [
                path.join(taxi_dir, "cab_front.png"),
                path.join(taxi_dir, "cab_rear.png"),
                path.join(taxi_dir, "cab_right.png"),
                path.join(taxi_dir, "cab_left.png"),
            ]
            self.taxi_imgs = [
                pygame.transform.scale(pygame.image.load(file_name), self.cell_size)
                for file_name in file_names
            ]
            
            # Using the gym taxi passenger and hotel
            self.passenger_img = pygame.transform.scale(
                pygame.image.load(path.join(taxi_dir, "passenger.png")), self.cell_size
            )
            # We tint the second passenger slightly or just use the same to keep it simple, 
            # let's tint it using pygame filling
            self.passenger2_img = self.passenger_img.copy()
            self.passenger2_img.fill((0, 200, 200), special_flags=pygame.BLEND_MULT) # Cyan-ish
            
            self.destination_img = pygame.transform.scale(
                pygame.image.load(path.join(taxi_dir, "hotel.png")), self.cell_size
            )
            self.destination_img.set_alpha(170)
            
            self.destination2_img = self.destination_img.copy()
            self.destination2_img.fill((255, 100, 100), special_flags=pygame.BLEND_MULT) # Red-ish
            self.destination2_img.set_alpha(170)

            self.median_horiz = [
                pygame.transform.scale(pygame.image.load(path.join(taxi_dir, f"gridworld_median_{x}.png")), self.cell_size)
                for x in ["left", "horiz", "right"]
            ]
            self.median_vert = [
                pygame.transform.scale(pygame.image.load(path.join(taxi_dir, f"gridworld_median_{x}.png")), self.cell_size)
                for x in ["top", "vert", "bottom"]
            ]
            self.background_img = pygame.transform.scale(
                pygame.image.load(path.join(taxi_dir, "taxi_background.png")), self.cell_size
            )

        for y in range(0, self.desc.shape[0]):
            for x in range(0, self.desc.shape[1]):
                cell = (x * self.cell_size[0], y * self.cell_size[1])
                self.window.blit(self.background_img, cell)
                if self.desc[y][x] == b"|" and (y == 0 or self.desc[y - 1][x] != b"|"):
                    self.window.blit(self.median_vert[0], cell)
                elif self.desc[y][x] == b"|" and (y == self.desc.shape[0] - 1 or self.desc[y + 1][x] != b"|"):
                    self.window.blit(self.median_vert[2], cell)
                elif self.desc[y][x] == b"|":
                    self.window.blit(self.median_vert[1], cell)
                elif self.desc[y][x] == b"-" and (x == 0 or self.desc[y][x - 1] != b"-"):
                    self.window.blit(self.median_horiz[0], cell)
                elif self.desc[y][x] == b"-" and (x == self.desc.shape[1] - 1 or self.desc[y][x + 1] != b"-"):
                    self.window.blit(self.median_horiz[2], cell)
                elif self.desc[y][x] == b"-":
                    self.window.blit(self.median_horiz[1], cell)

        for cell, color in zip(self.locs, self.locs_colors):
            color_cell = pygame.Surface(self.cell_size)
            color_cell.set_alpha(128)
            color_cell.fill(color)
            loc = self.get_surf_loc(cell)
            self.window.blit(color_cell, (loc[0], loc[1] + 10))

        if self.p1_loc < 4:
            self.window.blit(self.passenger_img, self.get_surf_loc(self.locs[self.p1_loc]))
        if self.p2_loc < 4:
            self.window.blit(self.passenger2_img, self.get_surf_loc(self.locs[self.p2_loc]))

        if self.lastaction in [0, 1, 2, 3]:
            self.taxi_orientation = self.lastaction
            
        dest1_loc = self.get_surf_loc(self.locs[self.p1_dest])
        dest2_loc = self.get_surf_loc(self.locs[self.p2_dest])
        taxi_location = self.get_surf_loc((self.taxi_row, self.taxi_col))

        # We draw destinations if Not delivered yet
        if self.p1_loc != 5:
            self.window.blit(self.destination_img, (dest1_loc[0], dest1_loc[1] - self.cell_size[1] // 2))
        if self.p2_loc != 5:
            self.window.blit(self.destination2_img, (dest2_loc[0], dest2_loc[1] - self.cell_size[1] // 2))

        # Draw taxi
        self.window.blit(self.taxi_imgs[self.taxi_orientation], taxi_location)
        
        # Overlay passengers if inside taxi (for visual fun)
        import pygame as pg
        if self.p1_loc == 4: # P1 inside
            mini_p1 = pg.transform.scale(self.passenger_img, (self.cell_size[0]/2, self.cell_size[1]/2))
            self.window.blit(mini_p1, taxi_location)
        if self.p2_loc == 4: # P2 inside
            mini_p2 = pg.transform.scale(self.passenger2_img, (self.cell_size[0]/2, self.cell_size[1]/2))
            self.window.blit(mini_p2, (taxi_location[0] + self.cell_size[0]/2, taxi_location[1]))

        if mode == "human":
            pygame.event.pump()
            pygame.display.update()
            self.clock.tick(self.metadata["render_fps"])
        elif mode == "rgb_array":
            import numpy as np
            return np.transpose(
                np.array(pygame.surfarray.pixels3d(self.window)), axes=(1, 0, 2)
            )

    def get_surf_loc(self, map_loc):
        return (map_loc[1] * 2 + 1) * self.cell_size[0], (map_loc[0] + 1) * self.cell_size[1]

    def close(self):
        if hasattr(self, 'window') and self.window is not None:
            import pygame
            pygame.display.quit()
            pygame.quit()
        super().close()


class TaxiEnvironmentSimulator:
    def __init__(self, render_mode=None, max_steps=400):
        self.env_id = 'MultiTaxi'
        self.render_mode = render_mode
        self.env = MultiPassengerTaxiEnv(render_mode=self.render_mode, max_steps=max_steps)

    @property
    def action_space_size(self):
        return self.env.action_space.n

    @property
    def state_space_size(self):
        return self.env.observation_space.n

    def reset(self, seed=None, curriculum_stage=None):
        return self.env.reset(seed=seed, curriculum_stage=curriculum_stage)

    def step(self, action):
        return self.env.step(action)


    def render(self):
        if self.render_mode:
            return self.env.render()

    def get_valid_actions(self):
        """Proxy to the underlying env's action mask."""
        return self.env.get_valid_actions()

    def get_discrete_state(self):
        """Returns the current state as a single integer for tabular agents (Q-table indexing)."""
        return int(self.env.s)

    def close(self):
        self.env.close()

