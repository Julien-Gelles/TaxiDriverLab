"""
Taxi Driver: Solve Taxi-v3 (Gymnasium) with Q-Learning.

Entry point. Supports two modes:
  - user: Interactive; user provides hyperparameters and runs train + test.
  - auto: Time-limited optimization placeholder (for future use).
"""

import argparse
import pickle
import time
from collections.abc import Callable
from pathlib import Path

import gymnasium as gym
import numpy as np

SAVE_DIR = Path(__file__).resolve().parent / "save"


def _save_agent(agent, agent_key: str, filename: str, *, double: bool = False) -> None:
    """Serialize a trained agent's learnable state to core/save/<filename>.pkl."""
    agent_key = agent_key.upper()
    if agent_key in ("B", "R"):
        print(f"  Agent {agent_key} has no learnable model to save — skipped.")
        return

    if hasattr(agent, "q_table") and not hasattr(agent, "policy_net"):
        payload = {"type": "qtable", "data": np.array(agent.q_table),
                   "agent_key": agent_key, "double": double}
    elif hasattr(agent, "policy_net"):
        payload = {"type": "dqn", "data": agent.policy_net.state_dict(),
                   "agent_key": agent_key, "double": double}
    else:
        print(f"  Unknown model type for agent {agent_key} — skipped.")
        return

    SAVE_DIR.mkdir(parents=True, exist_ok=True)
    path = SAVE_DIR / f"{filename}.pkl"
    with open(path, "wb") as f:
        pickle.dump(payload, f)
    print(f"  Modèle sauvegardé → {path}")


def _reconstruct_single_agent(agent_key: str, kind: str, data):
    """Create a single-passenger agent and inject the saved weights."""
    env = gym.make(ENV_ID)
    state_size = int(env.observation_space.n)
    action_size = int(env.action_space.n)
    env.close()

    if agent_key == "Q":
        agent = QLearningAgent(state_size, action_size, epsilon=0.0)
    elif agent_key == "S":
        agent = SARSAAgent(state_size, action_size, epsilon=0.0)
    elif agent_key == "M":
        agent = MonteCarloAgent(state_size, action_size, epsilon=0.0, first_visit=False)
    elif agent_key == "D":
        agent = DQNAgent(state_size, action_size, epsilon=0.0)
    else:
        raise ValueError(f"Agent '{agent_key}' has no learnable model.")

    if kind == "qtable":
        agent.q_table = np.array(data)
    elif kind == "dqn":
        agent.policy_net.load_state_dict(data)
        agent.target_net.load_state_dict(data)
    return agent


def _reconstruct_double_agent(agent_key: str, kind: str, data):
    """Create a double-passenger agent and inject the saved weights."""
    if agent_key == "Q":
        agent = Dbl_QLearningAgent(epsilon=0.0)
    elif agent_key == "S":
        agent = Dbl_SARSAAgent(epsilon=0.0)
    elif agent_key == "M":
        agent = Dbl_MonteCarloAgent(epsilon=0.0)
    elif agent_key == "D":
        agent = Dbl_DQNAgent(epsilon=0.0)
    else:
        raise ValueError(f"Agent '{agent_key}' has no learnable model.")

    if kind == "qtable":
        agent.q_table = np.array(data)
    elif kind == "dqn":
        agent.policy_net.load_state_dict(data)
        agent.target_net.load_state_dict(data)
    return agent


def _load_agent(filename: str):
    """
    Load a pretrained agent from core/save/<filename>.pkl.
    Returns (agent, agent_key, is_double).
    """
    path = SAVE_DIR / f"{filename}.pkl"
    if not path.exists():
        raise FileNotFoundError(
            f"Aucun modèle trouvé : {path}\n"
            f"  Lance d'abord : py -m core.main --agent Q --save {filename}"
        )
    with open(path, "rb") as f:
        payload = pickle.load(f)

    kind      = payload.get("type", "qtable")
    data      = payload["data"]
    agent_key = payload.get("agent_key", "Q").upper()
    is_double = payload.get("double", False)

    if is_double:
        agent = _reconstruct_double_agent(agent_key, kind, data)
    else:
        agent = _reconstruct_single_agent(agent_key, kind, data)

    if hasattr(agent, "set_epsilon"):
        agent.set_epsilon(0.0)
    return agent, agent_key, is_double


def run_pretrained_demo(args: argparse.Namespace, filename: str) -> None:
    """Load a pretrained model and run a pygame demo — no training at all."""
    print(f"Chargement du modèle '{filename}'…")
    try:
        agent, agent_key, is_double = _load_agent(filename)
    except (FileNotFoundError, KeyError, Exception) as exc:
        print(f"Erreur : {exc}")
        return

    # In pretrained-demo mode --episodes controls how many demo episodes to run.
    # Default 5000 is the training default, not meaningful here → fall back to 5.
    num_episodes = args.episodes if args.episodes != 5000 else 5
    mode_label = "double (2 passagers)" if is_double else "single (1 passager)"
    print(f"  Agent : {agent_key} · {mode_label} · ε=0 · {num_episodes} épisode(s)\n")

    default_delay_idx = 2
    control = {
        "pause": False,
        "quit": False,
        "delay_idx": default_delay_idx,
        "delay": PRESET_DELAYS[default_delay_idx],
    }

    if is_double:
        _run_render_demo_double(
            agent=agent,
            num_episodes=num_episodes,
            step_delay=PRESET_DELAYS[default_delay_idx],
            control=control,
        )
    else:
        _run_render_demo(
            agent=agent,
            num_episodes=num_episodes,
            step_delay=PRESET_DELAYS[default_delay_idx],
            seed=args.seed,
            control=control,
        )
    print("\nDone.")

try:
    import pygame
except ImportError:
    pygame = None

# ── Double-passenger agents ──────────────────────────────────────────────────
from core.agents.double.tabular.q_learning import (
    QLearningAgent as Dbl_QLearningAgent,
    train_agent as dbl_q_train_agent,
    get_training_metrics as dbl_q_get_training_metrics,
    test_agent as dbl_q_test_agent,
    get_evaluation_metrics as dbl_q_get_evaluation_metrics,
)
from core.agents.double.tabular.sarsa import (
    SARSAAgent as Dbl_SARSAAgent,
    train_agent as dbl_s_train_agent,
    get_training_metrics as dbl_s_get_training_metrics,
    test_agent as dbl_s_test_agent,
    get_evaluation_metrics as dbl_s_get_evaluation_metrics,
)
from core.agents.double.tabular.monte_carlo import (
    MonteCarloAgent as Dbl_MonteCarloAgent,
    train_agent as dbl_m_train_agent,
    get_training_metrics as dbl_m_get_training_metrics,
    test_agent as dbl_m_test_agent,
    get_evaluation_metrics as dbl_m_get_evaluation_metrics,
)
from core.agents.double.neural_network.deep_q_learning import (
    DQNAgent as Dbl_DQNAgent,
    train_agent as dbl_d_train_agent,
    get_training_metrics as dbl_d_get_training_metrics,
    test_agent as dbl_d_test_agent,
    get_evaluation_metrics as dbl_d_get_evaluation_metrics,
)
from core.agents.double.random.brute_force import (
    RandomAgent as Dbl_RandomAgent,
    train_agent as dbl_b_train_agent,
    get_training_metrics as dbl_b_get_training_metrics,
    test_agent as dbl_b_test_agent,
    get_evaluation_metrics as dbl_b_get_evaluation_metrics,
)
from core.agents.double.rule_based.heuristic import (
    HeuristicAgent as Dbl_HeuristicAgent,
    train_agent as dbl_h_train_agent,
    get_training_metrics as dbl_h_get_training_metrics,
    test_agent as dbl_h_test_agent,
    get_evaluation_metrics as dbl_h_get_evaluation_metrics,
)

# ── Single-passenger agents ───────────────────────────────────────────────────
from core.agents.single.tabular.q_learning import (
    QLearningAgent,
    train_agent as q_train_agent,
    get_training_metrics as q_get_training_metrics,
    test_agent as q_test_agent,
    get_evaluation_metrics as q_get_evaluation_metrics,
)
from core.agents.single.tabular.q_learning.train import TAXI_ACTION_NAMES
from core.agents.single.tabular.sarsa import (
    SARSAAgent,
    train_agent as s_train_agent,
    get_training_metrics as s_get_training_metrics,
    test_agent as s_test_agent,
    get_evaluation_metrics as s_get_evaluation_metrics,
)
from core.agents.single.tabular.monte_carlo import (
    MonteCarloAgent,
    train_agent as m_train_agent,
    get_training_metrics as m_get_training_metrics,
    test_agent as m_test_agent,
    get_evaluation_metrics as m_get_evaluation_metrics,
)
from core.agents.single.neural_network.deep_q_learning import (
    DQNAgent,
    train_agent as d_train_agent,
    get_training_metrics as d_get_training_metrics,
    test_agent as d_test_agent,
    get_evaluation_metrics as d_get_evaluation_metrics,
)
from core.agents.single.random.brute_force import (
    RandomAgent,
    train_agent as b_train_agent,
    get_training_metrics as b_get_training_metrics,
    test_agent as b_test_agent,
    get_evaluation_metrics as b_get_evaluation_metrics,
)
from core.agents.single.rule_based.heuristic import (
    HeuristicAgent,
    train_agent as h_train_agent,
    get_training_metrics as h_get_training_metrics,
    test_agent as h_test_agent,
    get_evaluation_metrics as h_get_evaluation_metrics,
)
from core.double_taxi_env import TaxiEnvironmentSimulator
from core.utils.utils import plot_training_summary
from core.utils.pygame_stats import PygameStatsWindow


ENV_ID = "Taxi-v4"
# Valeurs prédéfinies pour le délai d'affichage (secondes) : MIN (0) + 3 valeurs
PRESET_DELAYS: list[float] = [0.0, 0.02, 0.4]


def _run_render_demo(
    agent,
    num_episodes: int,
    step_delay: float,
    seed: int | None,
    stats_window: PygameStatsWindow | None = None,
    control: dict | None = None,
) -> "gym.Env | None":
    """
    Run greedy demo episodes with pygame rendering.

    Returns the demo env (without closing) when stats_window was provided so the
    caller can keep the window alive; otherwise closes the env before returning.
    """
    env = gym.make(ENV_ID, render_mode="rgb_array")
    demo_stats_window = stats_window
    if demo_stats_window is None:
        obs, _ = env.reset(seed=seed)
        try:
            frame = env.render()
            frame_shape = frame.shape if frame is not None and hasattr(frame, "shape") else None
        except Exception:
            frame_shape = None
        try:
            demo_stats_window = PygameStatsWindow(
                frame_shape=frame_shape,
                show_activations=hasattr(agent, "get_activations"),
            )
        except RuntimeError:
            env.close()
            return None

    if hasattr(agent, "set_epsilon"):
        agent.set_epsilon(0.0)
    try:
        for ep in range(num_episodes):
            if control and control.get("quit"):
                break
            obs, _ = env.reset(seed=seed)
            state = int(obs)
            total_reward = 0.0
            step_count = 0
            while True:
                if control and control.get("quit"):
                    break
                action = agent.choose_action(state, explore=False)
                next_obs, reward, terminated, truncated, _ = env.step(action)
                state = int(next_obs)
                total_reward += reward
                step_count += 1

                action_name = TAXI_ACTION_NAMES[action] if 0 <= action < len(TAXI_ACTION_NAMES) else str(action)
                current_delay = control.get("delay", step_delay) if control else step_delay
                stats_dict = {
                    "title": "--- Demo ---",
                    "episode": f"{ep + 1} / {num_episodes}",
                    "step": step_count,
                    "reward": total_reward,
                    "epsilon": 0.0,
                    "mode": "Exploitation",
                    "last_action": action_name,
                    "delay": current_delay,
                }
                demo_stats_window.update(stats_dict, env=env, control=control, agent=agent)

                if current_delay > 0:
                    time.sleep(current_delay)
                while control and control.get("pause") and not control.get("quit"):
                    demo_stats_window.update(stats_dict, env=env, control=control, agent=agent)
                    time.sleep(0.05)

                if terminated or truncated:
                    break
            print(f"  Demo episode {ep + 1}/{num_episodes}: reward = {total_reward:.0f}")
    finally:
        if stats_window is None:
            env.close()
            demo_stats_window.close()
            return None
    return env if stats_window is not None else None


def _run_render_demo_double(
    agent,
    num_episodes: int,
    step_delay: float,
    stats_window: "PygameStatsWindow | None" = None,
    control: dict | None = None,
) -> "TaxiEnvironmentSimulator | None":
    """
    Run greedy pygame demo episodes for the 2-passenger environment.

    Returns the env (without closing it) when stats_window was provided so the
    caller can keep the window alive; otherwise closes the env before returning.
    """
    is_heuristic = hasattr(agent, "reset_episode")
    is_dqn = hasattr(agent, "policy_net")

    demo_env = TaxiEnvironmentSimulator(render_mode="rgb_array")

    # Create a local window if no training window was passed (--demo without --render)
    demo_stats_window = stats_window
    if demo_stats_window is None:
        demo_env.reset()
        try:
            frame = demo_env.render()
            frame_shape = frame.shape if frame is not None and hasattr(frame, "shape") else None
        except Exception:
            frame_shape = None
        try:
            demo_stats_window = PygameStatsWindow(
                frame_shape=frame_shape,
                show_activations=is_dqn,
            )
        except RuntimeError:
            demo_env.close()
            return None

    if hasattr(agent, "set_epsilon"):
        saved_eps = agent.get_epsilon()
        agent.set_epsilon(0.0)
    else:
        saved_eps = None

    try:
        for ep in range(num_episodes):
            if control and control.get("quit"):
                break

            obs, _ = demo_env.reset()
            if is_heuristic:
                state = obs
                agent.reset_episode()
            elif is_dqn:
                state = obs
            else:
                state = demo_env.get_discrete_state()

            total_reward, step_count = 0.0, 0
            done = truncated = False

            while not (done or truncated):
                if control and control.get("quit"):
                    break

                if is_heuristic:
                    action = agent.get_action(state, explore=False, env=demo_env)
                else:
                    valid_mask = demo_env.get_valid_actions()
                    action = agent.get_action(state, explore=False, valid_actions_mask=valid_mask)

                next_obs, reward, done, truncated, _ = demo_env.step(action)

                if is_heuristic or is_dqn:
                    state = next_obs
                else:
                    state = demo_env.get_discrete_state()

                total_reward += reward
                step_count += 1

                current_delay = control.get("delay", step_delay) if control else step_delay
                action_name = TAXI_ACTION_NAMES[action] if 0 <= action < len(TAXI_ACTION_NAMES) else str(action)
                stats_dict = {
                    "title": "--- Demo 2P ---",
                    "episode": f"{ep + 1} / {num_episodes}",
                    "step": step_count,
                    "reward": total_reward,
                    "epsilon": 0.0,
                    "mode": "Exploitation",
                    "last_action": action_name,
                    "delay": current_delay,
                }

                demo_stats_window.update(stats_dict, env=demo_env, control=control, agent=agent)

                if current_delay > 0:
                    time.sleep(current_delay)

                while control and control.get("pause") and not control.get("quit"):
                    demo_stats_window.update(stats_dict, env=demo_env, control=control, agent=agent)
                    time.sleep(0.05)

            print(f"  Demo 2P episode {ep + 1}/{num_episodes}: reward = {total_reward:.0f}")
    finally:
        if saved_eps is not None:
            agent.set_epsilon(saved_eps)
        if stats_window is None:
            # We created a local window — close env and window, nothing for caller to manage.
            demo_env.close()
            demo_stats_window.close()
            demo_env = None

    return demo_env  # None unless caller must close it (when --render + --demo)


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Taxi Driver: Q-Learning on Gymnasium Taxi-v3.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    # Hyperparameters
    parser.add_argument("--alpha", type=float, default=0.1, help="Learning rate.")
    parser.add_argument("--gamma", type=float, default=0.99, help="Discount factor.")
    parser.add_argument("--epsilon", type=float, default=1.0, help="Initial exploration (epsilon).")
    parser.add_argument("--episodes", type=int, default=5000, help="Number of training episodes.")
    parser.add_argument("--test-episodes", type=int, default=100, help="Number of evaluation episodes (no render).")
    parser.add_argument("--seed", type=int, default=None, help="Random seed for reproducibility.")
    parser.add_argument(
        "--agent",
        type=str,
        nargs="?",
        default="Q",
        const="Q",
        choices=["B", "Q", "R", "S", "M", "D", "b", "q", "r", "s", "m", "d"],
        metavar="B|Q|R|S|M|D",
        help="Agent to run: B=brute force, Q=Q-learning, R=heuristic, S=SARSA, M=Monte Carlo, D=Deep Q-Network (default: Q if omitted or no value).",
    )
    # Visual & output
    parser.add_argument(
        "--render",
        action="store_true",
        default=False,
        help="Show pygame window during training (map + stats panel + Pause / Quit / delay controls).",
    )
    parser.add_argument(
        "--demo",
        nargs="?",
        type=str,
        const="__run__",
        default=None,
        metavar="FILENAME|N",
        help=(
            "Demo mode. Two usages:\n"
            "  --demo FILENAME  Load core/save/FILENAME.pkl and run demo, no training.\n"
            "                   Use --episodes N to control how many runs (default 5).\n"
            "  --demo N         After training, run N greedy demo episodes (default 5).\n"
            "  --demo           Same as --demo 5 (after training)."
        ),
    )
    parser.add_argument("--plot", action="store_true", help="Display training curves (reward, steps, epsilon).")
    parser.add_argument("--benchmark", action="store_true", help="Run random agent baseline and compare.")
    parser.add_argument("--double", action="store_true", help="Use 2-passenger environment and agents (core/agents/double/).")
    parser.add_argument(
        "--save",
        type=str,
        default=None,
        metavar="FILENAME",
        help="Save the trained model to core/save/FILENAME.pkl (e.g. --save qlearning). Compatible with the web dashboard demo mode.",
    )
    args = parser.parse_args()
    args.agent = (args.agent or "Q").upper()

    # Resolve --demo:
    #   None          → no demo
    #   "__run__"     → post-training demo, 5 episodes (--demo with no value)
    #   "<digits>"    → post-training demo, N episodes (--demo 10)
    #   "<filename>"  → pretrained demo, load from core/save/<filename>.pkl
    demo_raw = args.demo
    if demo_raw is None:
        args.demo_file = None
        args.demo_episodes = None
    elif demo_raw == "__run__" or demo_raw.isdigit():
        args.demo_file = None
        args.demo_episodes = int(demo_raw) if demo_raw.isdigit() else 5
    else:
        args.demo_file = demo_raw   # pretrained-demo mode
        args.demo_episodes = None   # unused in that path

    return args


def run_user_mode(args: argparse.Namespace) -> None:
    """
    User mode: train, evaluate, optionally plot, benchmark, and/or run demo.
    """
    render_window: bool = args.render
    stats_window: PygameStatsWindow | None = None
    stats_callback = None
    control: dict | None = None

    if render_window:
        default_delay_idx = 2
        control = {
            "pause": False,
            "quit": False,
            "delay_idx": default_delay_idx,
            "delay": PRESET_DELAYS[default_delay_idx],
        }
        env = gym.make(ENV_ID, render_mode="rgb_array")
        env.reset(seed=args.seed)
        try:
            frame = env.render()
            frame_shape = frame.shape if frame is not None and hasattr(frame, "shape") else None
        except Exception:
            frame_shape = None
        try:
            stats_window = PygameStatsWindow(frame_shape=frame_shape, show_activations=(args.agent == "D"))
            stats_callback = lambda s, e, c, a=None: stats_window.update(s, e, c, a)
        except RuntimeError as e:
            env.close()
            raise SystemExit(str(e)) from None
    else:
        env = gym.make(ENV_ID)

    state_size = env.observation_space.n
    action_size = env.action_space.n

    use_q = args.agent == "Q"
    use_sarsa = args.agent == "S"
    use_mc = args.agent == "M"
    use_dqn = args.agent == "D"
    use_heuristic = args.agent == "R"
    if use_q:
        agent = QLearningAgent(
            state_size=state_size,
            action_size=action_size,
            alpha=args.alpha,
            gamma=args.gamma,
            epsilon=args.epsilon,
            seed=args.seed,
        )
        train_agent = q_train_agent
        get_training_metrics = q_get_training_metrics
        test_agent = q_test_agent
        get_evaluation_metrics = q_get_evaluation_metrics
    elif use_sarsa:
        agent = SARSAAgent(
            state_size=state_size,
            action_size=action_size,
            alpha=args.alpha,
            gamma=args.gamma,
            epsilon=args.epsilon,
            seed=args.seed,
        )
        train_agent = s_train_agent
        get_training_metrics = s_get_training_metrics
        test_agent = s_test_agent
        get_evaluation_metrics = s_get_evaluation_metrics
    elif use_mc:
        agent = MonteCarloAgent(
            state_size=state_size,
            action_size=action_size,
            alpha=args.alpha,
            gamma=args.gamma,
            epsilon=args.epsilon,
            seed=args.seed,
            first_visit=False,  # every-visit MC converges faster
        )
        train_agent = m_train_agent
        get_training_metrics = m_get_training_metrics
        test_agent = m_test_agent
        get_evaluation_metrics = m_get_evaluation_metrics
    elif use_dqn:
        # DQN uses its own Adam learning rate (1e-3); the tabular --alpha (0.1)
        # would make the network diverge, so it is intentionally not wired here.
        agent = DQNAgent(
            state_size=state_size,
            action_size=action_size,
            lr=1e-3,
            gamma=args.gamma,
            epsilon=args.epsilon,
            seed=args.seed,
        )
        train_agent = d_train_agent
        get_training_metrics = d_get_training_metrics
        test_agent = d_test_agent
        get_evaluation_metrics = d_get_evaluation_metrics
    elif use_heuristic:
        agent = HeuristicAgent(action_size=action_size, seed=args.seed)
        train_agent = h_train_agent
        get_training_metrics = h_get_training_metrics
        test_agent = h_test_agent
        get_evaluation_metrics = h_get_evaluation_metrics
    else:
        agent = RandomAgent(action_size=action_size, seed=args.seed)
        train_agent = b_train_agent
        get_training_metrics = b_get_training_metrics
        test_agent = b_test_agent
        get_evaluation_metrics = b_get_evaluation_metrics

    step_delay_train = PRESET_DELAYS[control["delay_idx"]] if render_window else 0.0

    if use_q:
        agent_name = "Q-Learning"
    elif use_sarsa:
        agent_name = "SARSA"
    elif use_mc:
        agent_name = "Monte Carlo"
    elif use_dqn:
        agent_name = "Deep Q-Network"
    elif use_heuristic:
        agent_name = "heuristic"
    else:
        agent_name = "brute force"
    print(f"Training {agent_name} agent...")
    if render_window:
        print("  (fenêtre pygame : map + infos + boutons Pause / Quitter / délai)")
    if use_q or use_sarsa or use_mc:
        print(f"  alpha={args.alpha}, gamma={args.gamma}, epsilon={args.epsilon}, episodes={args.episodes}")
    elif use_dqn:
        print(f"  lr=1e-3, gamma={args.gamma}, epsilon={args.epsilon}, episodes={args.episodes}")
    else:
        print(f"  episodes={args.episodes}")
    if control is not None:
        control["pause"] = False
        control["quit"] = False
    train_kw: dict = {
        "agent": agent,
        "env": env,
        "num_episodes": args.episodes,
        "verbose": True,
        "seed": args.seed,
        "step_delay": step_delay_train,
        "stats_callback": stats_callback,
        "control": control,
        "check_input": None,
    }
    if use_q or use_sarsa or use_mc or use_dqn:
        min_eps = 0.01
        # Scale epsilon decay to the training budget so exploration lasts ~90% of
        # the run, instead of a fixed 0.995 that ends exploration by ~episode 900.
        # This is critical for Monte Carlo: with no bootstrapping, MC only learns
        # from episodes that actually reach the goal, so it needs exploration to
        # stay alive much longer. Q-Learning/SARSA/DQN bootstrap and tolerate fast
        # decay, but the adaptive schedule is safe (and fairer) for them too.
        train_kw["min_epsilon"] = min_eps
        train_kw["epsilon_decay"] = min_eps ** (1.0 / max(1, int(0.9 * args.episodes)))
    rewards, steps, epsilons, stopped_early = train_agent(**train_kw)
    mean_reward, mean_steps, success_rate = get_training_metrics(rewards, steps, window=100)
    print(f"\nTraining (last 100 episodes): mean reward = {mean_reward:.2f}, mean steps = {mean_steps:.1f}, success rate = {success_rate:.1%}")

    # Si l'utilisateur a demandé à quitter pendant l'entraînement, on arrête ici.
    if control is not None and control.get("quit"):
        env.close()
        if stats_window is not None:
            stats_window.close()
            stats_window = None
        print("\nArrêt demandé (quit).")
        return

    if args.plot:
        plot_training_summary(rewards, steps, smoothing_window=100, epsilons=epsilons if (use_q or use_sarsa or use_mc or use_dqn) else None)

    # Evaluation: no render (fast)
    print(f"\nEvaluating {agent_name} agent (greedy, no exploration)...")
    test_rewards, test_steps = test_agent(
        agent,
        env,
        num_episodes=args.test_episodes,
        seed=args.seed,
        step_delay=0.0,
    )
    mean_test_r, mean_test_s, test_success_rate = get_evaluation_metrics(test_rewards, test_steps)
    print(f"Test: mean reward = {mean_test_r:.2f}, mean steps = {mean_test_s:.1f}, success rate = {test_success_rate:.1%}")

    if args.save:
        print(f"\nSauvegarde du modèle ({args.agent})...")
        _save_agent(agent, args.agent, args.save, double=False)

    if args.benchmark:
        if use_q:
            print("\nBenchmarking random (brute-force) agent...")
            other_agent = RandomAgent(action_size=action_size, seed=args.seed)
            other_test_agent = b_test_agent
            other_get_eval = b_get_evaluation_metrics
            other_name = "Random (brute force)"
        else:
            print("\nBenchmarking Q-Learning agent...")
            other_agent = QLearningAgent(
                state_size=state_size,
                action_size=action_size,
                alpha=args.alpha,
                gamma=args.gamma,
                epsilon=0.0,
                seed=args.seed,
            )
            other_test_agent = q_test_agent
            other_get_eval = q_get_evaluation_metrics
            other_name = "Q-Learning"
        r_rewards, r_steps = other_test_agent(
            other_agent,
            env,
            num_episodes=args.test_episodes,
            seed=args.seed,
            step_delay=0.0,
        )
        r_mean_r, r_mean_s, r_success = other_get_eval(r_rewards, r_steps)
        print(f"{other_name}: mean reward = {r_mean_r:.2f}, mean steps = {r_mean_s:.1f}, success rate = {r_success:.1%}")
        print(f"{agent_name} vs {other_name}: reward {mean_test_r:.2f} vs {r_mean_r:.2f}, steps {mean_test_s:.1f} vs {r_mean_s:.1f}, success {test_success_rate:.1%} vs {r_success:.1%}")

    if stats_window is None:
        env.close()

    demo_env = None
    if args.demo_episodes is not None:
        default_delay_idx = 2
        if control is None:
            control = {
                "pause": False,
                "quit": False,
                "delay_idx": default_delay_idx,
                "delay": PRESET_DELAYS[default_delay_idx],
            }
        else:
            control["pause"] = False
            control["quit"] = False
            control["delay_idx"] = default_delay_idx
            control["delay"] = PRESET_DELAYS[default_delay_idx]
        demo_delay = PRESET_DELAYS[2]
        print(f"\nDemo: {args.demo_episodes} épisode(s) pygame (greedy), delay={demo_delay}s")
        demo_env = _run_render_demo(
            agent=agent,
            num_episodes=args.demo_episodes,
            step_delay=demo_delay,
            seed=args.seed,
            stats_window=stats_window,
            control=control,
        )

    # Si l'utilisateur a appuyé sur Quitter (bouton ou touche) pendant la démo,
    # fermer immédiatement la fenêtre et les environnements.
    if control is not None and control.get("quit"):
        if stats_window is not None:
            stats_window.close()
        env.close()
        if demo_env is not None:
            demo_env.close()
        print("\nArrêt demandé (quit).")
        print("\nDone.")
        return

    if stats_window is not None:
        print("\nFermez la fenêtre pour quitter.")
        quit_requested = False
        while not quit_requested:
            if pygame and pygame.get_init():
                if control is not None:
                    stats_window.process_events(control)
                else:
                    for event in pygame.event.get():
                        if event.type == pygame.QUIT:
                            quit_requested = True
                            break
                if control is not None and control.get("quit"):
                    quit_requested = True
            else:
                break
            if not quit_requested:
                time.sleep(0.05)
        stats_window.close()
        env.close()
        if demo_env is not None:
            demo_env.close()

    print("\nDone.")


def run_double_mode(args: argparse.Namespace) -> None:
    """
    Double-passenger mode: 2-passenger custom environment (TaxiEnvironmentSimulator).
    Supports --render pygame/terminal, --demo, --plot, and --benchmark
    with the same UX as single-passenger mode.
    """
    render_window: bool = args.render
    stats_window: PygameStatsWindow | None = None
    stats_callback = None
    control: dict | None = None

    agent_key = args.agent  # B | Q | R | S | M | D

    if render_window:
        default_delay_idx = 2
        control = {
            "pause": False,
            "quit": False,
            "delay_idx": default_delay_idx,
            "delay": PRESET_DELAYS[default_delay_idx],
        }
        env = TaxiEnvironmentSimulator(render_mode="rgb_array")
        env.reset()
        try:
            frame = env.render()
            frame_shape = frame.shape if frame is not None and hasattr(frame, "shape") else None
        except Exception:
            frame_shape = None
        try:
            stats_window = PygameStatsWindow(frame_shape=frame_shape, show_activations=(agent_key == "D"))
            stats_callback = lambda s, e, c, a=None: stats_window.update(s, e, c, a)
        except RuntimeError as exc:
            env.close()
            raise SystemExit(str(exc)) from None
    else:
        env = TaxiEnvironmentSimulator()

    # Build agent
    if agent_key == "Q":
        agent = Dbl_QLearningAgent(alpha=args.alpha, gamma=args.gamma, epsilon=args.epsilon)
        train_fn, train_metrics_fn = dbl_q_train_agent, dbl_q_get_training_metrics
        test_fn, eval_metrics_fn = dbl_q_test_agent, dbl_q_get_evaluation_metrics
        agent_name = "Q-Learning (double)"
    elif agent_key == "S":
        agent = Dbl_SARSAAgent(alpha=args.alpha, gamma=args.gamma, epsilon=args.epsilon)
        train_fn, train_metrics_fn = dbl_s_train_agent, dbl_s_get_training_metrics
        test_fn, eval_metrics_fn = dbl_s_test_agent, dbl_s_get_evaluation_metrics
        agent_name = "SARSA (double)"
    elif agent_key == "M":
        agent = Dbl_MonteCarloAgent(alpha=args.alpha, gamma=args.gamma, epsilon=args.epsilon)
        train_fn, train_metrics_fn = dbl_m_train_agent, dbl_m_get_training_metrics
        test_fn, eval_metrics_fn = dbl_m_test_agent, dbl_m_get_evaluation_metrics
        agent_name = "Monte Carlo (double)"
    elif agent_key == "D":
        agent = Dbl_DQNAgent(gamma=args.gamma, epsilon=args.epsilon)
        train_fn, train_metrics_fn = dbl_d_train_agent, dbl_d_get_training_metrics
        test_fn, eval_metrics_fn = dbl_d_test_agent, dbl_d_get_evaluation_metrics
        agent_name = "Deep Q-Network (double)"
    elif agent_key == "R":
        agent = Dbl_HeuristicAgent()
        train_fn, train_metrics_fn = dbl_h_train_agent, dbl_h_get_training_metrics
        test_fn, eval_metrics_fn = dbl_h_test_agent, dbl_h_get_evaluation_metrics
        agent_name = "Heuristic (double)"
    else:  # B
        agent = Dbl_RandomAgent()
        train_fn, train_metrics_fn = dbl_b_train_agent, dbl_b_get_training_metrics
        test_fn, eval_metrics_fn = dbl_b_test_agent, dbl_b_get_evaluation_metrics
        agent_name = "Brute Force (double)"

    print(f"Training {agent_name} agent  [2 passengers, capacity=1]")
    if agent_key in ("Q", "S", "M"):
        print(f"  alpha={args.alpha}, gamma={args.gamma}, epsilon={args.epsilon}, episodes={args.episodes}")
    elif agent_key == "D":
        print(f"  lr=1e-3, gamma={args.gamma}, epsilon={args.epsilon}, episodes={args.episodes}")
    else:
        print(f"  episodes={args.episodes}")
    if render_window:
        print("  (fenêtre pygame : map + infos + boutons Pause / Quitter / délai)")

    if control is not None:
        control["pause"] = False
        control["quit"] = False

    step_delay_train = PRESET_DELAYS[control["delay_idx"]] if render_window else 0.0

    rewards, steps, successes, stopped_early = train_fn(
        agent=agent,
        env=env,
        num_episodes=args.episodes,
        verbose=True,
        seed=args.seed,
        step_delay=step_delay_train,
        stats_callback=stats_callback,
        control=control,
        check_input=None,
    )
    mean_r, mean_s, success_rate = train_metrics_fn(rewards, steps, successes, window=100)
    print(f"\nTraining (last 100 eps): mean reward={mean_r:.2f}, mean steps={mean_s:.1f}, both delivered={success_rate:.1%}")

    if control is not None and control.get("quit"):
        if stats_window is not None:
            stats_window.close()
        env.close()
        print("\nArrêt demandé (quit).")
        return

    if args.plot:
        plot_training_summary(rewards, steps, smoothing_window=100, epsilons=None)

    # Evaluation: test.py functions create their own clean env (no render_mode)
    print(f"\nEvaluating {agent_name} (greedy)...")
    t_rewards, t_steps, t_successes = test_fn(agent, num_episodes=args.test_episodes, verbose=False)
    t_mean_r, t_mean_s, t_success = eval_metrics_fn(t_rewards, t_steps, t_successes)
    print(f"Test ({args.test_episodes} eps): mean reward={t_mean_r:.2f}, mean steps={t_mean_s:.1f}, both delivered={t_success:.1%}")

    if args.save:
        print(f"\nSauvegarde du modèle ({agent_key}, double)...")
        _save_agent(agent, agent_key, args.save, double=True)

    if args.benchmark:
        print("\nBenchmarking Brute Force (double)...")
        ref = Dbl_RandomAgent()
        r_r, r_s, r_suc = dbl_b_test_agent(ref, num_episodes=args.test_episodes, verbose=False)
        r_mean_r, r_mean_s, r_success = dbl_b_get_evaluation_metrics(r_r, r_s, r_suc)
        print(f"  Brute Force:  reward={r_mean_r:.2f}, steps={r_mean_s:.1f}, both delivered={r_success:.1%}")
        print(f"  {agent_name}: reward={t_mean_r:.2f}, steps={t_mean_s:.1f}, both delivered={t_success:.1%}")

    if stats_window is None:
        env.close()

    demo_env = None
    if args.demo_episodes is not None:
        default_delay_idx = 2
        if control is None:
            control = {
                "pause": False, "quit": False,
                "delay_idx": default_delay_idx,
                "delay": PRESET_DELAYS[default_delay_idx],
            }
        else:
            control["pause"] = False
            control["quit"] = False
            control["delay_idx"] = default_delay_idx
            control["delay"] = PRESET_DELAYS[default_delay_idx]
        demo_delay = PRESET_DELAYS[2]
        print(f"\nDemo 2P: {args.demo_episodes} épisode(s) pygame (greedy), delay={demo_delay}s")
        demo_env = _run_render_demo_double(
            agent=agent,
            num_episodes=args.demo_episodes,
            step_delay=demo_delay,
            stats_window=stats_window,
            control=control,
        )

    if control is not None and control.get("quit"):
        if stats_window is not None:
            stats_window.close()
        if stats_window is None:
            pass  # env already closed above
        else:
            env.close()
        if demo_env is not None:
            demo_env.close()
        print("\nArrêt demandé (quit).")
        print("\nDone.")
        return

    if stats_window is not None:
        print("\nFermez la fenêtre pour quitter.")
        quit_requested = False
        while not quit_requested:
            if pygame and pygame.get_init():
                if control is not None:
                    stats_window.process_events(control)
                else:
                    for event in pygame.event.get():
                        if event.type == pygame.QUIT:
                            quit_requested = True
                            break
                if control is not None and control.get("quit"):
                    quit_requested = True
            else:
                break
            if not quit_requested:
                time.sleep(0.05)
        stats_window.close()
        env.close()
        if demo_env is not None:
            demo_env.close()

    print("\nDone.")


def main() -> None:
    args = parse_args()
    if args.demo_file is not None:
        # Pretrained-demo mode: load model and run demo, no training.
        run_pretrained_demo(args, args.demo_file)
    elif args.double:
        run_double_mode(args)
    else:
        run_user_mode(args)


if __name__ == "__main__":
    main()
