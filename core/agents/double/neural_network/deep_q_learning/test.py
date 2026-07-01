import numpy as np
from core.double_taxi_env import TaxiEnvironmentSimulator


def test_agent(agent, num_episodes: int, verbose: bool = True):
    """
    Evaluate a DQN agent (greedy, no exploration).
    Returns (rewards, steps, successes).
    """
    env = TaxiEnvironmentSimulator()
    saved_epsilon = agent.get_epsilon()
    agent.set_epsilon(0.0)

    rewards, steps, successes = [], [], []

    for _ in range(num_episodes):
        state, _ = env.reset()
        total_reward, step_count = 0.0, 0
        done = truncated = False

        while not (done or truncated):
            valid_mask = env.get_valid_actions()
            action = agent.get_action(state, explore=False, valid_actions_mask=valid_mask)
            state, reward, done, truncated, _ = env.step(action)
            total_reward += reward
            step_count += 1

        rewards.append(total_reward)
        steps.append(step_count)
        successes.append(bool(done))

    agent.set_epsilon(saved_epsilon)
    env.close()

    if verbose:
        print(f"[DQN] Test {num_episodes} eps | "
              f"R: {np.mean(rewards):.1f} | "
              f"Steps: {np.mean(steps):.1f} | "
              f"Success: {np.mean(successes):.2f}")

    return rewards, steps, successes


def get_evaluation_metrics(rewards, steps, successes):
    return (
        float(np.mean(rewards)),
        float(np.mean(steps)),
        float(np.mean(successes)),
    )
