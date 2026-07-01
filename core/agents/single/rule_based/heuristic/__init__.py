"""
Package heuristic : agent à politique déterministe (règles fixes).

Expose agent, train et test comme pour q_learning et brute_force.
"""

from .agent import HeuristicAgent
from .train import train_agent, get_training_metrics
from .test import test_agent, get_evaluation_metrics

__all__ = [
    "HeuristicAgent",
    "train_agent",
    "get_training_metrics",
    "test_agent",
    "get_evaluation_metrics",
]
