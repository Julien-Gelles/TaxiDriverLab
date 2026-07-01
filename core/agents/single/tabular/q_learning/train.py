"""
Training loop for the Taxi-v3 environment.

Runs episodic training with the provided agent and returns metrics
(mean reward, mean steps) over the training run.
"""

import time
import gymnasium as gym
from collections.abc import Callable
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from core.agents.single.tabular.q_learning.agent import QLearningAgent

# Taxi-v3: 0=South, 1=North, 2=East, 3=West, 4=Pickup, 5=Dropoff
TAXI_ACTION_NAMES = ("South", "North", "East", "West", "Pickup", "Dropoff")



def train_agent(
    agent: "QLearningAgent",
    env: gym.Env,
    num_episodes: int,
    epsilon_decay: float = 0.995,
    min_epsilon: float = 0.01,
    verbose: bool = True,
    seed: int | None = None,
    step_delay: float = 0.0,
    stats_callback: Callable[[dict, gym.Env, dict, Any], None] | None = None,
    control: dict | None = None,
    check_input: Callable[[dict], None] | None = None,
) -> tuple[list[float], list[int], list[float], bool]:
    """
    Run the training loop for a fixed number of episodes.

    Each episode runs until termination or truncation. After each episode,
    the agent's epsilon is decayed for less exploration over time.

    Args:
        agent: Q-Learning agent to train.
        env: Gymnasium environment (e.g. Taxi-v3).
        num_episodes: Number of training episodes.
        epsilon_decay: Multiplier for epsilon after each episode.
        min_epsilon: Minimum epsilon (floor for exploration).
        verbose: If True, print progress every 100 episodes.
        seed: Optional seed for env reset (for reproducibility).
        step_delay: If > 0, delay in seconds after each step (for visual render).
        render_ansi: If True, clear terminal and print env.render() + stats each step (mode terminal).
        stats_callback: If set, called each step with (stats_dict, env, control, agent).
        control: Optional dict with "pause" and "quit" keys; when "quit" is True, return early.
        check_input: Optional callable check_input(control) to poll keyboard (e.g. terminal p/q keys).

    Returns:
        (rewards, steps, epsilons, stopped_early).
    """
    rewards: list[float] = []
    steps: list[int] = []
    epsilons: list[float] = []
    if control is None:
        control = {}

    for episode in range(num_episodes):
        if control.get("quit"):
            return rewards, steps, epsilons, True
        epsilons.append(agent.get_epsilon())
        obs, info = env.reset(seed=seed)
        state = int(obs)
        total_reward = 0.0
        step_count = 0

        while True:
            if control and check_input is not None:
                check_input(control)
            if control.get("quit"):
                return rewards, steps, epsilons, True
            action = agent.choose_action(state, explore=True)
            next_obs, reward, terminated, truncated, info = env.step(action)
            next_state = int(next_obs)
            done = terminated or truncated

            agent.update_q_value(state, action, reward, next_state, terminated)

            total_reward += reward
            step_count += 1
            state = next_state

            current_delay = control.get("delay", step_delay) if control else step_delay
            if stats_callback is not None:
                # En mode très rapide (MIN), n'afficher qu'une frame toutes les 200 itérations
                if current_delay <= 0:
                    should_render = step_count == 1 or step_count % 200 == 0
                else:
                    should_render = True
                if should_render:
                    action_name = TAXI_ACTION_NAMES[action] if 0 <= action < len(TAXI_ACTION_NAMES) else str(action)
                    mode = "Exploration" if agent.get_last_was_exploration() else "Exploitation"
                    stats_dict = {
                        "title": "--- Infos tour ---",
                        "episode": f"{episode + 1} / {num_episodes}",
                        "step": step_count,
                        "reward": total_reward,
                        "epsilon": agent.get_epsilon(),
                        "mode": mode,
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

            if done:
                break

        rewards.append(total_reward)
        steps.append(step_count)
        agent.decay_epsilon(epsilon_decay, min_epsilon)

        if verbose and (episode + 1) % 100 == 0:
            last_100_r = rewards[-100:]
            last_100_s = steps[-100:]
            mean_r = sum(last_100_r) / 100
            mean_s = sum(last_100_s) / 100
            successes = sum(1 for r in last_100_r if r > SUCCESS_REWARD_THRESHOLD)
            success_rate = successes / 100
            print(f"Episode {episode + 1}/{num_episodes} | "
                  f"Mean reward (last 100): {mean_r:.2f} | "
                  f"Mean steps (last 100): {mean_s:.1f} | "
                  f"Success rate: {success_rate:.1%} | "
                  f"epsilon: {agent.get_epsilon():.4f}")

    return rewards, steps, epsilons, False


# Episode counted as "success" when total reward > this (Taxi-v3: drop-off gives +20, -1/step → success ⇒ reward > 0)
SUCCESS_REWARD_THRESHOLD = 0


def get_training_metrics(
    rewards: list[float],
    steps: list[int],
    window: int = 100,
) -> tuple[float, float, float]:
    """
    Compute mean reward, mean steps and success rate over the last `window` episodes.

    Success = episode total reward > 0 (agent completed drop-off; in Taxi-v3 total = 21 - steps).

    Args:
        rewards: List of episode rewards.
        steps: List of episode step counts.
        window: Number of episodes to average over (e.g. last 100).

    Returns:
        (mean_reward, mean_steps, success_rate) over the last `window` episodes.
    """
    n = min(window, len(rewards))
    if n == 0:
        return 0.0, 0.0, 0.0
    last_r = rewards[-n:]
    last_s = steps[-n:]
    mean_reward = sum(last_r) / n
    mean_steps = sum(last_s) / n
    success_rate = sum(1 for r in last_r if r > SUCCESS_REWARD_THRESHOLD) / n
    return mean_reward, mean_steps, success_rate
