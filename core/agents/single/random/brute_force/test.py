"""
Évaluation (test) pour l'agent brute force sur Taxi-v3.

Exécute des épisodes sans apprentissage et retourne les métriques d'évaluation.
"""

import time
import gymnasium as gym
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .agent import RandomAgent

# Succès = reward total > 0 (drop-off réussi)
SUCCESS_REWARD_THRESHOLD = 0


def test_agent(
    agent: "RandomAgent",
    env: gym.Env,
    num_episodes: int,
    verbose: bool = True,
    seed: int | None = None,
    step_delay: float = 0.0,
) -> tuple[list[float], list[int]]:
    """
    Exécute num_episodes épisodes d'évaluation avec l'agent aléatoire.

    Args:
        agent: RandomAgent à évaluer.
        env: Environnement Gymnasium.
        num_episodes: Nombre d'épisodes.
        verbose: Si True, affiche un résumé après l'évaluation.
        seed: Graine optionnelle pour env.reset.
        step_delay: Délai en secondes après chaque step (rendu).
        render_ansi: Si True, affiche la grille à chaque step (mode terminal).

    Returns:
        (rewards, steps) : liste des rewards totaux et des steps par épisode.
    """
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

    if verbose:
        n = len(rewards)
        mean_r = sum(rewards) / n if n else 0.0
        mean_s = sum(steps) / n if n else 0.0
        success_rate = sum(1 for r in rewards if r > SUCCESS_REWARD_THRESHOLD) / n if n else 0.0
        print(
            f"Evaluation (brute force) over {num_episodes} episodes: "
            f"Mean reward = {mean_r:.2f}, Mean steps = {mean_s:.1f}, Success rate = {success_rate:.1%}"
        )

    return rewards, steps


def get_evaluation_metrics(rewards: list[float], steps: list[int]) -> tuple[float, float, float]:
    """
    Calcule mean reward, mean steps et taux de succès sur tous les épisodes.

    Succès = reward total > 0 (drop-off réussi).

    Args:
        rewards: Liste des rewards par épisode.
        steps: Liste des steps par épisode.

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
