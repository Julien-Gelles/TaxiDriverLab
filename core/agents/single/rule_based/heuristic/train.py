"""
Boucle d'entraînement pour l'agent heuristique (politique déterministe).

Aucune mise à jour de paramètres : on exécute des épisodes avec la politique fixe
et on collecte les métriques (reward, steps) pour analyse / comparaison.
"""

import time
import gymnasium as gym
from collections.abc import Callable
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .agent import HeuristicAgent

# Taxi-v3 : 0=South, 1=North, 2=East, 3=West, 4=Pickup, 5=Dropoff
TAXI_ACTION_NAMES = ("South", "North", "East", "West", "Pickup", "Dropoff")

# Succès = reward total d'épisode > 0 (drop-off réussi)
SUCCESS_REWARD_THRESHOLD = 0



def train_agent(
    agent: "HeuristicAgent",
    env: gym.Env,
    num_episodes: int,
    verbose: bool = True,
    seed: int | None = None,
    step_delay: float = 0.0,
    stats_callback: Callable[[dict, gym.Env, dict, Any], None] | None = None,
    control: dict | None = None,
    check_input: Callable[[dict], None] | None = None,
) -> tuple[list[float], list[int], list[float], bool]:
    """
    Exécute num_episodes épisodes avec l'agent heuristique (aucun apprentissage).

    Chaque épisode se termine à la fin de l'épisode (terminated/truncated).
    Retourne les métriques pour comparaison avec le Q-Learning et le brute force.

    Args:
        agent: Agent HeuristicAgent.
        env: Environnement Gymnasium (ex. Taxi-v3).
        num_episodes: Nombre d'épisodes.
        verbose: Si True, affiche la progression tous les 100 épisodes.
        seed: Graine optionnelle pour env.reset.
        step_delay: Délai en secondes après chaque step (rendu visuel).
        stats_callback: Optionnel, appelé à chaque step avec (stats_dict, env, control, agent).
        control: Dict optionnel avec "pause", "quit", "delay" ; si "quit" True, retour anticipé.
        check_input: Optionnel, appelé pour lire le clavier (pause / quit / délai).

    Returns:
        (rewards, steps, epsilons, stopped_early). epsilons est une liste de 0.0 (compatibilité).
    """
    rewards: list[float] = []
    steps: list[int] = []
    epsilons: list[float] = []
    if control is None:
        control = {}

    for episode in range(num_episodes):
        if control.get("quit"):
            return rewards, steps, epsilons, True
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

            total_reward += reward
            step_count += 1
            state = next_state

            current_delay = control.get("delay", step_delay) if control else step_delay
            if stats_callback is not None:
                if current_delay <= 0:
                    should_render = step_count == 1 or step_count % 200 == 0
                else:
                    should_render = True
                if should_render:
                    action_name = TAXI_ACTION_NAMES[action] if 0 <= action < len(TAXI_ACTION_NAMES) else str(action)
                    stats_dict = {
                        "title": "--- Infos tour (heuristic) ---",
                        "episode": f"{episode + 1} / {num_episodes}",
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

            if done:
                break

        rewards.append(total_reward)
        steps.append(step_count)
        epsilons.append(0.0)

        if verbose and (episode + 1) % 100 == 0:
            last_100_r = rewards[-100:]
            last_100_s = steps[-100:]
            mean_r = sum(last_100_r) / len(last_100_r)
            mean_s = sum(last_100_s) / len(last_100_s)
            successes = sum(1 for r in last_100_r if r > SUCCESS_REWARD_THRESHOLD)
            success_rate = successes / len(last_100_r)
            print(
                f"Episode {episode + 1}/{num_episodes} | "
                f"Mean reward (last 100): {mean_r:.2f} | "
                f"Mean steps (last 100): {mean_s:.1f} | "
                f"Success rate: {success_rate:.1%}"
            )

    return rewards, steps, epsilons, False


def get_training_metrics(
    rewards: list[float],
    steps: list[int],
    window: int = 100,
) -> tuple[float, float, float]:
    """
    Calcule mean reward, mean steps et taux de succès sur les derniers `window` épisodes.

    Succès = reward total > 0 (drop-off réussi).

    Args:
        rewards: Liste des rewards par épisode.
        steps: Liste des nombres de steps par épisode.
        window: Nombre d'épisodes pour la moyenne (ex. 100).

    Returns:
        (mean_reward, mean_steps, success_rate) sur les derniers `window` épisodes.
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
