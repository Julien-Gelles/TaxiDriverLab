"""
Utility functions: plotting and visualization.

Provides reward curve and steps curve plotting for training/evaluation
analysis using matplotlib.
"""

import matplotlib.pyplot as plt
import numpy as np


def smooth_curve(values: list[float], window: int) -> np.ndarray:
    """
    Compute a simple moving average over the given values.

    Args:
        values: List of scalars (e.g. rewards or steps per episode).
        window: Window size for moving average.

    Returns:
        Array of same length as values; first (window-1) points use
        partial windows, then full window average.
    """
    arr = np.array(values, dtype=np.float64)
    n = len(arr)
    if window <= 1 or n == 0:
        return arr
    smoothed = np.copy(arr)
    for i in range(1, min(window, n)):
        smoothed[i] = np.mean(arr[: i + 1])
    for i in range(window, n):
        smoothed[i] = np.mean(arr[i - window + 1 : i + 1])
    return smoothed


def plot_reward_curve(
    rewards: list[float],
    smoothing_window: int = 100,
    title: str = "Training: Reward per Episode",
    xlabel: str = "Episode",
    ylabel: str = "Total Reward",
    save_path: str | None = None,
) -> None:
    """
    Plot raw and smoothed reward per episode.

    Args:
        rewards: List of total reward per episode.
        smoothing_window: Window for moving average (e.g. 100).
        title: Plot title.
        xlabel: Label for x-axis.
        ylabel: Label for y-axis.
        save_path: If set, save figure to this path.
    """
    plt.figure(figsize=(10, 5))
    episodes = np.arange(1, len(rewards) + 1)
    plt.plot(episodes, rewards, alpha=0.3, color="blue", label="Raw")
    if len(rewards) >= smoothing_window:
        smoothed = smooth_curve(rewards, smoothing_window)
        plt.plot(episodes, smoothed, color="blue", linewidth=2, label=f"Smoothed (w={smoothing_window})")
    plt.xlabel(xlabel)
    plt.ylabel(ylabel)
    plt.title(title)
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=150)
        print(f"Saved reward curve to {save_path}")
    plt.show()


def plot_steps_curve(
    steps: list[int],
    smoothing_window: int = 100,
    title: str = "Training: Steps per Episode",
    xlabel: str = "Episode",
    ylabel: str = "Steps",
    save_path: str | None = None,
) -> None:
    """
    Plot raw and smoothed steps per episode.

    Args:
        steps: List of step count per episode.
        smoothing_window: Window for moving average.
        title: Plot title.
        xlabel: Label for x-axis.
        ylabel: Label for y-axis.
        save_path: If set, save figure to this path.
    """
    plt.figure(figsize=(10, 5))
    episodes = np.arange(1, len(steps) + 1)
    steps_float = [float(s) for s in steps]
    plt.plot(episodes, steps_float, alpha=0.3, color="green", label="Raw")
    if len(steps) >= smoothing_window:
        smoothed = smooth_curve(steps_float, smoothing_window)
        plt.plot(episodes, smoothed, color="green", linewidth=2, label=f"Smoothed (w={smoothing_window})")
    plt.xlabel(xlabel)
    plt.ylabel(ylabel)
    plt.title(title)
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=150)
        print(f"Saved steps curve to {save_path}")
    plt.show()


def plot_training_summary(
    rewards: list[float],
    steps: list[int],
    smoothing_window: int = 100,
    save_path: str | None = None,
    epsilons: list[float] | None = None,
) -> None:
    """
    Plot reward, steps and optionally epsilon curves.

    Args:
        rewards: List of total reward per episode.
        steps: List of step count per episode.
        smoothing_window: Window for smoothing.
        save_path: If set, save the combined figure to this path.
        epsilons: Optional list of epsilon at start of each episode (adds third subplot).
    """
    n_plots = 3 if epsilons is not None else 2
    fig, axes = plt.subplots(n_plots, 1, figsize=(10, 4 * n_plots), sharex=True)
    if n_plots == 2:
        ax1, ax2 = axes
    else:
        ax1, ax2, ax3 = axes

    episodes = np.arange(1, len(rewards) + 1)
    ax1.plot(episodes, rewards, alpha=0.3, color="blue", label="Raw")
    if len(rewards) >= smoothing_window:
        ax1.plot(
            episodes,
            smooth_curve(rewards, smoothing_window),
            color="blue",
            linewidth=2,
            label=f"Smoothed (w={smoothing_window})",
        )
    ax1.set_ylabel("Total Reward")
    ax1.set_title("Reward per Episode")
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    steps_float = [float(s) for s in steps]
    ax2.plot(episodes, steps_float, alpha=0.3, color="green", label="Raw")
    if len(steps) >= smoothing_window:
        ax2.plot(
            episodes,
            smooth_curve(steps_float, smoothing_window),
            color="green",
            linewidth=2,
            label=f"Smoothed (w={smoothing_window})",
        )
    ax2.set_ylabel("Steps")
    ax2.set_title("Steps per Episode")
    ax2.legend()
    ax2.grid(True, alpha=0.3)

    if epsilons is not None:
        ax3.plot(episodes, epsilons, color="orange", linewidth=1)
        ax3.set_xlabel("Episode")
        ax3.set_ylabel("Epsilon")
        ax3.set_title("Exploration rate (epsilon) per Episode")
        ax3.grid(True, alpha=0.3)
    else:
        ax2.set_xlabel("Episode")

    plt.tight_layout()
    if save_path:
        fig.savefig(save_path, dpi=150)
        print(f"Saved training summary to {save_path}")
    plt.show()
