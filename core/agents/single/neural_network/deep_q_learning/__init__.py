"""
Deep Q-Network (DQN) agent module.

Function-approximation reinforcement learning: a neural network replaces the
tabular Q-table, stabilised with experience replay and a target network.
"""

from core.agents.single.neural_network.deep_q_learning.agent import DQNAgent
from core.agents.single.neural_network.deep_q_learning.train import train_agent, get_training_metrics
from core.agents.single.neural_network.deep_q_learning.test import test_agent, get_evaluation_metrics

__all__ = [
    "DQNAgent",
    "train_agent",
    "get_training_metrics",
    "test_agent",
    "get_evaluation_metrics",
]
