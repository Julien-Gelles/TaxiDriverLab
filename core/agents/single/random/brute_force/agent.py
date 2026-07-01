"""
Agent brute force : politique aléatoire (mouvements uniformément aléatoires).

Aucun apprentissage ; utilisé comme baseline pour comparer avec le Q-Learning.
"""

import numpy as np


class RandomAgent:
    """
    Agent qui choisit une action uniformément au hasard à chaque pas.

    Interface compatible avec QLearningAgent (choose_action, get_epsilon, etc.)
    pour pouvoir réutiliser les mêmes boucles d'entraînement/évaluation.
    """

    def __init__(self, action_size: int, seed: int | None = None) -> None:
        """
        Initialise l'agent aléatoire.

        Args:
            action_size: Nombre d'actions discrètes.
            seed: Graine aléatoire optionnelle (reproductibilité).
        """
        self.action_size = action_size
        self._rng = np.random.default_rng(seed)

    def choose_action(self, state: int, explore: bool = True) -> int:
        """
        Ignore l'état et choisit une action aléatoire.

        Args:
            state: État courant (non utilisé ; compatibilité d'interface).
            explore: Non utilisé ; conservé pour compatibilité avec QLearningAgent.

        Returns:
            Indice d'action dans [0, action_size).
        """
        return int(self._rng.integers(0, self.action_size))

    def get_epsilon(self) -> float:
        """Toujours 1 (exploration totale) pour affichage cohérent."""
        return 1.0

    def set_epsilon(self, epsilon: float) -> None:
        """Sans effet ; conservé pour compatibilité avec QLearningAgent."""
        pass

    def get_last_was_exploration(self) -> bool:
        """Toujours True (chaque action est aléatoire)."""
        return True
