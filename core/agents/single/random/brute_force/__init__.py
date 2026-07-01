"""
Package brute force : agent à politique aléatoire (baseline).

Expose agent, train et test comme pour q_learning.
"""

from .agent import RandomAgent
from .train import train_agent, get_training_metrics
from .test import test_agent, get_evaluation_metrics

__all__ = [
    "RandomAgent",
    "train_agent",
    "get_training_metrics",
    "test_agent",
    "get_evaluation_metrics",
]
