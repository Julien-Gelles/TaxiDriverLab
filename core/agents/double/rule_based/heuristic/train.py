import time
import numpy as np
from collections.abc import Callable

TAXI_ACTION_NAMES = ("South", "North", "East", "West", "Pickup", "Dropoff")



def train_agent(
    agent,
    env,
    num_episodes: int,
    verbose: bool = True,
    seed: int | None = None,
    step_delay: float = 0.0,
    stats_callback: Callable | None = None,
    control: dict | None = None,
    check_input: Callable | None = None,
):
    """
    Run num_episodes with HeuristicAgent (deterministic FSM, no learning).
    Returns (rewards, steps, successes, stopped_early).
    """
    if control is None:
        control = {}

    rewards, steps, successes = [], [], []

    for ep in range(num_episodes):
        if control.get("quit"):
            return rewards, steps, successes, True

        state, _ = env.reset()
        agent.reset_episode()
        total_reward, step_count = 0.0, 0
        done = truncated = False

        while not (done or truncated):
            if check_input:
                check_input(control)
            if control.get("quit"):
                return rewards, steps, successes, True

            # Heuristic agent reads env internals directly
            action = agent.get_action(state, explore=False, env=env)
            state, reward, done, truncated, _ = env.step(action)
            total_reward += reward
            step_count += 1

            current_delay = control.get("delay", step_delay) if control else step_delay
            if stats_callback is not None:
                should_render = (current_delay > 0) or step_count == 1 or step_count % 200 == 0
                if should_render:
                    action_name = TAXI_ACTION_NAMES[action] if 0 <= action < len(TAXI_ACTION_NAMES) else str(action)
                    stats_dict = {
                        "title": "--- 2 Passagers ---",
                        "episode": f"{ep + 1} / {num_episodes}",
                        "step": step_count,
                        "reward": total_reward,
                        "epsilon": 0.0,
                        "mode": "Heuristique",
                        "last_action": action_name,
                        "delay": current_delay,
                    }
                    stats_callback(stats_dict, env, control, agent)
                    while control.get("pause") and not control.get("quit"):
                        if stats_callback is not None:
                            stats_callback(stats_dict, env, control, agent)
                        if check_input is not None:
                            check_input(control)
                        time.sleep(0.05)
            if step_delay > 0:
                time.sleep(current_delay)

        agent.on_episode_end(ep)
        rewards.append(total_reward)
        steps.append(step_count)
        successes.append(bool(done))

        if verbose and (ep + 1) % 100 == 0:
            w = min(100, ep + 1)
            print(f"[Heuristic] Ep {ep+1}/{num_episodes} | "
                  f"R: {np.mean(rewards[-w:]):.1f} | "
                  f"Success: {np.mean(successes[-w:]):.2f}")

    return rewards, steps, successes, False


def get_training_metrics(rewards, steps, successes, window: int = 100):
    n = len(rewards)
    sl = slice(max(0, n - window), n)
    return float(np.mean(rewards[sl])), float(np.mean(steps[sl])), float(np.mean(successes[sl]))
