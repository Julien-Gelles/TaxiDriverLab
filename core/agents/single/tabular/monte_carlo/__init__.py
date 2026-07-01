"""
Monte Carlo control agent module.

First-visit Monte Carlo tabular reinforcement learning for discrete MDPs.
"""

from core.agents.single.tabular.monte_carlo.agent import MonteCarloAgent
from core.agents.single.tabular.monte_carlo.train import train_agent, get_training_metrics
from core.agents.single.tabular.monte_carlo.test import test_agent, get_evaluation_metrics

__all__ = [
    "MonteCarloAgent",
    "train_agent",
    "get_training_metrics",
    "test_agent",
    "get_evaluation_metrics",
]
