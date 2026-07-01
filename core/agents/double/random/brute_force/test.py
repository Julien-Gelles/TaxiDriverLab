import numpy as np
from core.double_taxi_env import TaxiEnvironmentSimulator


def test_agent(agent, num_episodes: int, verbose: bool = True):
    """
    Evaluate the RandomAgent (exploration stays on — random by nature).
    Returns (rewards, steps, successes).
    """
    env = TaxiEnvironmentSimulator()
    rewards, steps, successes = [], [], []

    for ep in range(num_episodes):
        env.reset()
        state = env.get_discrete_state()
        total_reward, step_count = 0.0, 0
        done = truncated = False

        while not (done or truncated):
            valid_mask = env.get_valid_actions()
            action = agent.get_action(state, explore=True, valid_actions_mask=valid_mask)
            _, reward, done, truncated, _ = env.step(action)
            state = env.get_discrete_state()
            total_reward += reward
            step_count += 1

        rewards.append(total_reward)
        steps.append(step_count)
        successes.append(bool(done))

    env.close()

    if verbose:
        print(f"[BruteForce] Test {num_episodes} eps | "
              f"R: {np.mean(rewards):.1f} | "
              f"Steps: {np.mean(steps):.1f} | "
              f"Success: {np.mean(successes):.2f}")

    return rewards, steps, successes


def get_evaluation_metrics(rewards, steps, successes):
    """Returns (mean_reward, mean_steps, success_rate)."""
    return (
        float(np.mean(rewards)),
        float(np.mean(steps)),
        float(np.mean(successes)),
    )
