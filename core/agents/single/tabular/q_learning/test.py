"""
Evaluation (testing) for the Taxi-v3 environment.

Runs episodes without exploration (greedy policy) and returns
evaluation metrics.
"""

import time
import gymnasium as gym
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.agents.single.tabular.q_learning.agent import QLearningAgent
    from core.agents.single.random.brute_force import RandomAgent


def test_agent(
    agent: "QLearningAgent | RandomAgent",
    env: gym.Env,
    num_episodes: int,
    verbose: bool = True,
    seed: int | None = None,
    step_delay: float = 0.0,
) -> tuple[list[float], list[int]]:
    """
    Run evaluation episodes with no exploration (greedy policy for Q-Learning).

    For QLearningAgent, epsilon is set to 0 during evaluation.
    For RandomAgent, behavior is unchanged (random actions).

    Args:
        agent: Agent to evaluate (QLearningAgent or RandomAgent).
        env: Gymnasium environment.
        num_episodes: Number of evaluation episodes.
        verbose: If True, print summary after evaluation.
        seed: Optional seed for env reset.
        step_delay: If > 0, delay in seconds after each step (for visual render).
        render_ansi: If True, clear terminal and print env.render() each step (ansi mode).

    Returns:
        rewards: List of total reward per episode.
        steps: List of number of steps per episode.
    """
    # Disable exploration for Q-Learning agent (no effect on RandomAgent)
    if hasattr(agent, "set_epsilon"):
        original_epsilon = agent.get_epsilon()
        agent.set_epsilon(0.0)

    rewards: list[float] = []
    steps: list[int] = []

    for episode in range(num_episodes):
        obs, info = env.reset(seed=seed)
        state = int(obs)
        total_reward = 0.0
        step_count = 0

        while True:
            action = agent.choose_action(state, explore=False)
            next_obs, reward, terminated, truncated, info = env.step(action)
            next_state = int(next_obs)
            total_reward += reward
            step_count += 1
            state = next_state
            if step_delay > 0:
                time.sleep(step_delay)
            if terminated or truncated:
                break

        rewards.append(total_reward)
        steps.append(step_count)

    if hasattr(agent, "set_epsilon"):
        agent.set_epsilon(original_epsilon)

    if verbose:
        n = len(rewards)
        mean_r = sum(rewards) / n if n else 0.0
        mean_s = sum(steps) / n if n else 0.0
        success_rate = sum(1 for r in rewards if r > SUCCESS_REWARD_THRESHOLD) / n if n else 0.0
        print(f"Evaluation over {num_episodes} episodes: "
              f"Mean reward = {mean_r:.2f}, Mean steps = {mean_s:.1f}, Success rate = {success_rate:.1%}")

    return rewards, steps


# Episode counted as "success" when total reward > this (Taxi-v3: success ⇒ reward > 0)
SUCCESS_REWARD_THRESHOLD = 0


def get_evaluation_metrics(rewards: list[float], steps: list[int]) -> tuple[float, float, float]:
    """
    Compute mean reward, mean steps and success rate over all evaluation episodes.

    Success = episode total reward > 0 (agent completed drop-off; in Taxi-v3 total = 21 - steps).

    Args:
        rewards: List of episode rewards.
        steps: List of episode step counts.

    Returns:
        (mean_reward, mean_steps, success_rate).
    """
    n = len(rewards)
    if n == 0:
        return 0.0, 0.0, 0.0
    mean_reward = sum(rewards) / n
    mean_steps = sum(steps) / n
    success_rate = sum(1 for r in rewards if r > SUCCESS_REWARD_THRESHOLD) / n
    return mean_reward, mean_steps, success_rate
