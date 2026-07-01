"""
Runs a Taxi-v4 (single) or 2-passenger (double) simulation in a background
thread and streams the decoded state over a WebSocket queue.

Supports all 6 agent types for both modes:
  Q = Q-Learning   S = SARSA   M = Monte Carlo
  D = Deep Q-Net   B = Brute Force (random)   R = Heuristic (rule-based)

Single mode  → Gymnasium Taxi-v4, discrete state integer.
Double mode  → custom TaxiEnvironmentSimulator (2 passengers, capacity = 1).
"""

import threading
import time
from collections.abc import Callable
from typing import Any

import gymnasium as gym

# ── Single-passenger agents ──────────────────────────────────────────────────
from core.agents.single.tabular.q_learning import QLearningAgent
from core.agents.single.tabular.sarsa import SARSAAgent
from core.agents.single.tabular.monte_carlo import MonteCarloAgent
from core.agents.single.neural_network.deep_q_learning import DQNAgent
from core.agents.single.random.brute_force import RandomAgent
from core.agents.single.rule_based.heuristic import HeuristicAgent

# ── Double-passenger agents ──────────────────────────────────────────────────
from core.agents.double.tabular.q_learning import QLearningAgent as DblQLearningAgent
from core.agents.double.tabular.sarsa import SARSAAgent as DblSARSAAgent
from core.agents.double.tabular.monte_carlo import MonteCarloAgent as DblMonteCarloAgent
from core.agents.double.neural_network.deep_q_learning import DQNAgent as DblDQNAgent
from core.agents.double.random.brute_force import RandomAgent as DblRandomAgent
from core.agents.double.rule_based.heuristic import HeuristicAgent as DblHeuristicAgent
from core.double_taxi_env import TaxiEnvironmentSimulator

from .taxi import ACTION_NAMES, decode_state, decode_double_env
from . import pretrained as pt

ENV_ID = "Taxi-v4"
DEFAULT_DELAY = 0.25
# Default per-episode step cap, depending on the number of passengers.
# Single → Gymnasium's Taxi-v4 TimeLimit (200); double → the simulator's own
# horizon (400). Both are overridable from the UI via the ``maxSteps`` param.
DEFAULT_MAX_STEPS_SINGLE = 200
DEFAULT_MAX_STEPS_DOUBLE = 400
# Cap the live stream at ~30 fps. At high speed (delay ~ 0) the worker would
# otherwise produce thousands of frames/sec, flooding the WebSocket and making
# pause/stop laggy. Throttling by wall-clock keeps the animation visible and
# the controls responsive whatever the speed.
MIN_FRAME_INTERVAL = 1.0 / 30
# The Q-table is heavy (e.g. 500×6 floats) so refresh the heatmap once every N
# streamed steps — the map/step stream stays smooth, the heatmap a touch slower.
QTABLE_FRAME_SKIP = 3


# ── Agent factories ──────────────────────────────────────────────────────────

def _make_single_agent(key: str, state_size: int, action_size: int, params: dict, seed: int | None):
    key = (key or "Q").upper()
    alpha = float(params.get("alpha", 0.1))
    gamma = float(params.get("gamma", 0.99))
    epsilon = float(params.get("epsilon", 1.0))
    if key == "B":
        return RandomAgent(action_size=action_size, seed=seed)
    if key == "R":
        return HeuristicAgent(action_size=action_size, seed=seed)
    if key == "S":
        return SARSAAgent(state_size=state_size, action_size=action_size,
                          alpha=alpha, gamma=gamma, epsilon=epsilon, seed=seed)
    if key == "M":
        return MonteCarloAgent(state_size=state_size, action_size=action_size,
                               alpha=alpha, gamma=gamma, epsilon=epsilon,
                               seed=seed, first_visit=False)
    if key == "D":
        return DQNAgent(state_size=state_size, action_size=action_size,
                        lr=1e-3, gamma=gamma, epsilon=epsilon, seed=seed)
    # Default: Q-Learning
    return QLearningAgent(state_size=state_size, action_size=action_size,
                          alpha=alpha, gamma=gamma, epsilon=epsilon, seed=seed)


def _make_double_agent(key: str, params: dict):
    key = (key or "Q").upper()
    alpha = float(params.get("alpha", 0.1))
    gamma = float(params.get("gamma", 0.99))
    epsilon = float(params.get("epsilon", 1.0))
    if key == "B":
        return DblRandomAgent()
    if key == "R":
        return DblHeuristicAgent()
    if key == "S":
        return DblSARSAAgent(alpha=alpha, gamma=gamma, epsilon=epsilon)
    if key == "M":
        return DblMonteCarloAgent(alpha=alpha, gamma=gamma, epsilon=epsilon)
    if key == "D":
        return DblDQNAgent(gamma=gamma, epsilon=epsilon)
    # Default: Q-Learning
    return DblQLearningAgent(alpha=alpha, gamma=gamma, epsilon=epsilon)


# ── Session ──────────────────────────────────────────────────────────────────

class SimulationSession:
    """One running simulation, controllable (pause / speed / stop) from the API."""

    def __init__(self, emit: Callable[[dict], None]) -> None:
        self._emit = emit
        self._thread: threading.Thread | None = None
        self._control: dict[str, Any] = {
            "pause": False,
            "quit": False,
            "delay": DEFAULT_DELAY,
        }

    # ------------------------------------------------------------------ control
    def start(self, params: dict) -> None:
        self.stop()
        control: dict[str, Any] = {
            "pause": False,
            "quit": False,
            "delay": max(0.0, float(params.get("delay", DEFAULT_DELAY))),
        }
        self._control = control
        is_double = bool(params.get("double", False))
        target = self._run_double if is_double else self._run_single
        self._thread = threading.Thread(target=target, args=(params, control), daemon=True)
        self._thread.start()

    def pause(self) -> None:
        self._control["pause"] = True

    def resume(self) -> None:
        self._control["pause"] = False

    def set_delay(self, delay: float) -> None:
        self._control["delay"] = max(0.0, float(delay))

    def stop(self) -> None:
        self._control["quit"] = True
        thread = self._thread
        if thread is not None and thread.is_alive():
            thread.join(timeout=2.0)
        self._thread = None

    # ------------------------------------------------------------------- helpers
    def _await_resume(self, control: dict) -> None:
        while control["pause"] and not control["quit"]:
            time.sleep(0.05)

    def _should_stream(self, done: bool, now: float, last_stream: float) -> bool:
        return done or (now - last_stream) >= MIN_FRAME_INTERVAL

    # ------------------------------------------------- agent introspection msgs
    @staticmethod
    def _caps(agent: Any) -> dict:
        """Detect which live visualisations an agent can feed (Q-table / network)."""
        return {
            "hasQTable": hasattr(agent, "q_table"),
            "isNeural": hasattr(agent, "get_activations"),
        }

    def _qtable_msg(self, agent: Any) -> dict | None:
        """Snapshot of the Q-table (rounded) + the row to highlight, or None."""
        q = getattr(agent, "q_table", None)
        if q is None:
            return None
        try:
            arr = q  # numpy array (tabular) or reconstructed for the DQN
            return {
                "type": "qtable",
                "q": arr.round(2).tolist(),
                "lastState": getattr(agent, "_last_updated_state", None),
            }
        except Exception:
            return None

    def _activations_msg(self, agent: Any) -> dict | None:
        """Per-layer activations of the network for the current state (DQN only)."""
        state = getattr(agent, "_current_state", None)
        if state is None or not hasattr(agent, "get_activations"):
            return None
        try:
            acts = agent.get_activations(state)
            return {
                "type": "activations",
                "embedding": acts["embedding"].tolist(),
                "hidden": acts["hidden"].tolist(),
                "output": acts["output"].tolist(),
            }
        except Exception:
            return None

    def _weights_msg(self, agent: Any) -> dict | None:
        """Linear-layer weight matrices for the network graph (DQN only)."""
        if not hasattr(agent, "get_weights"):
            return None
        try:
            w = agent.get_weights()
            return {
                "type": "weights",
                "fc1": w["fc1"].tolist(),
                "fc2": w["fc2"].tolist(),
            }
        except Exception:
            return None

    def _emit_agent_views(self, agent: Any, caps: dict, step: int) -> None:
        """Emit Q-table (throttled), network activations and weights with a step."""
        if caps["hasQTable"] and step % QTABLE_FRAME_SKIP == 0:
            msg = self._qtable_msg(agent)
            if msg is not None:
                self._emit(msg)
        if caps["isNeural"]:
            acts = self._activations_msg(agent)
            if acts is not None:
                self._emit(acts)
            # Weights drift every learning step, so refresh the edges live too
            # (small matrices); otherwise the links would only move once per
            # episode while the node colours update every frame.
            weights = self._weights_msg(agent)
            if weights is not None:
                self._emit(weights)

    # --------------------------------------------------------- single-mode worker
    def _run_single(self, params: dict, control: dict) -> None:
        agent_key = (params.get("agent") or "Q").upper()
        episodes = int(params.get("episodes", 20))
        seed = params.get("seed")
        seed = int(seed) if seed is not None else None
        max_steps = params.get("maxSteps")
        max_steps = int(max_steps) if max_steps else DEFAULT_MAX_STEPS_SINGLE

        is_demo = params.get("mode") == "demo"
        is_sarsa = agent_key == "S"
        is_mc = agent_key == "M"
        is_dqn = agent_key == "D"
        learns = agent_key not in ("B", "R")

        env = gym.make(ENV_ID, max_episode_steps=max_steps)
        try:
            state_size = int(env.observation_space.n)
            action_size = int(env.action_space.n)
            agent = _make_single_agent(agent_key, state_size, action_size, params, seed)

            # Demo mode: load a model and freeze exploration; nothing is learned
            # here. A model can come from two places:
            #   - params["model"]: a Q-table the UI saved from an in-app training
            #     run and is now replaying (additive — does not touch the
            #     read-only core/save/ pretrained flow below);
            #   - otherwise the matching pretrained model from core/save/.
            pretrained_loaded = False
            if is_demo:
                payload = params.get("model") or pt.load_payload(agent_key, False)
                if payload is not None:
                    pretrained_loaded = pt.apply_payload(agent, payload)
                if hasattr(agent, "set_epsilon"):
                    agent.set_epsilon(0.0)

            caps = self._caps(agent)

            self._emit({
                "type": "started",
                "agent": agent_key,
                "episodes": episodes,
                "learns": learns,
                "double": False,
                "demo": is_demo,
                "pretrainedLoaded": pretrained_loaded,
                **caps,
            })
            if caps["isNeural"]:
                weights = self._weights_msg(agent)
                if weights is not None:
                    self._emit(weights)

            # Cumulative action histogram for the whole run (every step counts,
            # even the ones the stream throttle skips).
            action_counts = [0] * len(ACTION_NAMES)

            for ep in range(episodes):
                if control["quit"]:
                    break

                # Seed only the first reset: the run stays reproducible, but
                # each episode draws a fresh layout instead of replaying the
                # same one (passenger/destination would otherwise never vary).
                obs, _ = env.reset(seed=seed if ep == 0 else None)
                state = int(obs)
                total_reward = 0.0
                step = 0
                trajectory: list[tuple[int, int, float]] = []
                terminated = False
                last_stream = 0.0

                while True:
                    self._await_resume(control)
                    if control["quit"]:
                        break

                    action = agent.choose_action(state, explore=not is_demo)
                    if 0 <= action < len(action_counts):
                        action_counts[action] += 1
                    next_obs, reward, terminated, truncated, _ = env.step(action)
                    next_state = int(next_obs)
                    done = terminated or truncated

                    # Agent-specific Q-update (skipped entirely in demo mode)
                    if not is_demo:
                        if is_mc:
                            trajectory.append((state, action, reward))
                        elif is_sarsa:
                            next_action = agent.choose_action(next_state, explore=True)
                            agent.update_q_value(state, action, reward, next_state, next_action, terminated)
                        elif is_dqn:
                            agent.observe(state, action, reward, next_state, done)
                        elif learns:
                            agent.update_q_value(state, action, reward, next_state, terminated)

                    state = next_state
                    total_reward += reward
                    step += 1

                    delay = float(control["delay"])
                    now = time.monotonic()
                    if self._should_stream(done, now, last_stream):
                        self._emit(self._single_step_msg(ep, episodes, step, total_reward, action, agent, next_state, done, action_counts))
                        self._emit_agent_views(agent, caps, step)
                        last_stream = now
                    if delay > 0:
                        time.sleep(delay)
                    if done:
                        break

                # Episode-end updates (skipped in demo mode — model is frozen)
                if not is_demo:
                    if is_mc and trajectory:
                        agent.update_from_episode(trajectory, terminated,
                                                  last_next_state=state if not terminated else None)
                    if is_dqn:
                        agent.end_episode()
                    if learns:
                        agent.decay_epsilon(0.995, 0.01)

                if caps["isNeural"]:
                    weights = self._weights_msg(agent)
                    if weights is not None:
                        self._emit(weights)

                self._emit({
                    "type": "episode",
                    "episode": ep + 1,
                    "episodes": episodes,
                    "reward": total_reward,
                    "steps": step,
                    "epsilon": agent.get_epsilon() if hasattr(agent, "get_epsilon") else None,
                    "success": total_reward > 0,
                })

            self._emit({"type": "done", "stopped": bool(control["quit"])})
        finally:
            env.close()

    def _single_step_msg(self, ep, episodes, step, total_reward, action, agent, state, done, action_counts) -> dict:
        explored = agent.get_last_was_exploration() if hasattr(agent, "get_last_was_exploration") else False
        return {
            "type": "step",
            "episode": ep + 1,
            "episodes": episodes,
            "step": step,
            **decode_state(state),
            "reward": total_reward,
            "lastAction": int(action),
            "lastActionName": ACTION_NAMES[action] if 0 <= action < len(ACTION_NAMES) else str(action),
            "actionCounts": list(action_counts),
            "epsilon": agent.get_epsilon() if hasattr(agent, "get_epsilon") else None,
            "mode": "explore" if explored else "exploit",
            "done": bool(done),
            "double": False,
        }

    # --------------------------------------------------------- double-mode worker
    def _run_double(self, params: dict, control: dict) -> None:
        agent_key = (params.get("agent") or "Q").upper()
        episodes = int(params.get("episodes", 20))
        seed = params.get("seed")
        seed = int(seed) if seed is not None else None
        max_steps = params.get("maxSteps")
        max_steps = int(max_steps) if max_steps else DEFAULT_MAX_STEPS_DOUBLE

        is_demo = params.get("mode") == "demo"
        is_dqn = agent_key == "D"
        is_heuristic = agent_key == "R"
        learns = agent_key not in ("B", "R")

        env = TaxiEnvironmentSimulator(max_steps=max_steps)
        try:
            agent = _make_double_agent(agent_key, params)

            # Demo mode: replay a UI-provided Q-table (params["model"]) if any,
            # else the matching pretrained model from core/save/. Additive — the
            # existing pretrained flow is unchanged when no model is supplied.
            pretrained_loaded = False
            if is_demo:
                payload = params.get("model") or pt.load_payload(agent_key, True)
                if payload is not None:
                    pretrained_loaded = pt.apply_payload(agent, payload)
                if hasattr(agent, "set_epsilon"):
                    agent.set_epsilon(0.0)

            caps = self._caps(agent)

            self._emit({
                "type": "started",
                "agent": agent_key,
                "episodes": episodes,
                "learns": learns,
                "double": True,
                "demo": is_demo,
                "pretrainedLoaded": pretrained_loaded,
                **caps,
            })
            if caps["isNeural"]:
                weights = self._weights_msg(agent)
                if weights is not None:
                    self._emit(weights)

            # Cumulative action histogram for the whole run.
            action_counts = [0] * len(ACTION_NAMES)

            for ep in range(episodes):
                if control["quit"]:
                    break

                # Seed only the first reset (reproducible run, varied episodes).
                obs, _ = env.reset(seed=seed if ep == 0 else None)
                if is_heuristic:
                    agent.reset_episode()

                # Tabular agents use discrete integer; DQN/heuristic use feature vector
                state = obs if (is_dqn or is_heuristic) else env.get_discrete_state()
                total_reward = 0.0
                step_count = 0
                terminated = False
                last_stream = 0.0

                while True:
                    self._await_resume(control)
                    if control["quit"]:
                        break

                    valid_mask = env.get_valid_actions()
                    if is_heuristic:
                        action = agent.get_action(state, explore=False, env=env)
                    else:
                        action = agent.get_action(state, explore=not is_demo, valid_actions_mask=valid_mask)

                    if 0 <= action < len(action_counts):
                        action_counts[action] += 1
                    next_obs, reward, terminated, truncated, _ = env.step(action)
                    done = terminated or truncated

                    next_state = next_obs if (is_dqn or is_heuristic) else env.get_discrete_state()

                    if learns and not is_demo:
                        next_valid = env.get_valid_actions()
                        agent.update(state, action, reward, next_state, done, next_valid_mask=next_valid)

                    state = next_state
                    total_reward += reward
                    step_count += 1

                    delay = float(control["delay"])
                    now = time.monotonic()
                    if self._should_stream(done, now, last_stream):
                        self._emit(self._double_step_msg(ep, episodes, step_count, total_reward, action, agent, env, done, action_counts))
                        self._emit_agent_views(agent, caps, step_count)
                        last_stream = now
                    if delay > 0:
                        time.sleep(delay)
                    if done:
                        break

                # Episode-end: MC buffers here; DQN updates target net and decays epsilon
                if learns and not is_demo:
                    agent.on_episode_end(ep)
                    # Q/S on_episode_end is a no-op → decay explicitly
                    if agent_key in ("Q", "S"):
                        agent.decay_epsilon(0.995, 0.01)

                if caps["isNeural"]:
                    weights = self._weights_msg(agent)
                    if weights is not None:
                        self._emit(weights)

                self._emit({
                    "type": "episode",
                    "episode": ep + 1,
                    "episodes": episodes,
                    "reward": total_reward,
                    "steps": step_count,
                    "epsilon": agent.get_epsilon() if hasattr(agent, "get_epsilon") else None,
                    "success": bool(terminated),
                })

            self._emit({"type": "done", "stopped": bool(control["quit"])})
        finally:
            env.close()

    def _double_step_msg(self, ep, episodes, step, total_reward, action, agent, env, done, action_counts) -> dict:
        explored = agent.get_last_was_exploration() if hasattr(agent, "get_last_was_exploration") else False
        return {
            "type": "step",
            "episode": ep + 1,
            "episodes": episodes,
            "step": step,
            **decode_double_env(env),
            "reward": total_reward,
            "lastAction": int(action),
            "lastActionName": ACTION_NAMES[action] if 0 <= action < len(ACTION_NAMES) else str(action),
            "actionCounts": list(action_counts),
            "epsilon": agent.get_epsilon() if hasattr(agent, "get_epsilon") else None,
            "mode": "explore" if explored else "exploit",
            "done": bool(done),
            "double": True,
        }
