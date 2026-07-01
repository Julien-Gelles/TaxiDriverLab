"""
SARSA (State-Action-Reward-State-Action) agent module.

On-policy tabular reinforcement learning for discrete MDPs.
"""

from core.agents.single.tabular.sarsa.agent import SARSAAgent
from core.agents.single.tabular.sarsa.train import train_agent, get_training_metrics
from core.agents.single.tabular.sarsa.test import test_agent, get_evaluation_metrics

__all__ = [
    "SARSAAgent",
    "train_agent",
    "get_training_metrics",
    "test_agent",
    "get_evaluation_metrics",
]
