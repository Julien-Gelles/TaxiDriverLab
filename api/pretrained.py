"""
Read-only loader for pretrained agent models used by demo mode.

Models live in ``core/save/`` (committed to the repo) and are produced
separately by the core CLI — this module never trains or writes them.

Each ``.pkl`` is a dict:
    {
        "type":      "qtable" | "dqn",
        "data":      numpy.ndarray (tabular) | state_dict (DQN),
        "agent_key": "Q" | "S" | "M" | "D",
        "double":    bool,
    }
"""

import pickle
from pathlib import Path
from typing import Any

import numpy as np

# core/save sits beside the api package: <repo>/core/save.
SAVE_DIR = Path(__file__).resolve().parent.parent / "core" / "save"

# Only these agents carry a learnable model; B (random) and R (heuristic) don't.
TRAINABLE_AGENTS = frozenset({"Q", "S", "M", "D"})


def _iter_models():
    """Yield (path, payload) for every readable .pkl in core/save/."""
    if not SAVE_DIR.exists():
        return
    for p in sorted(SAVE_DIR.glob("*.pkl")):
        try:
            with open(p, "rb") as f:
                yield p, pickle.load(f)
        except Exception:
            continue


def list_available() -> list[dict]:
    """Return [{"agent", "double"}] for every pretrained model on disk."""
    out: list[dict] = []
    for _, payload in _iter_models():
        key = str(payload.get("agent_key", "")).upper()
        if key in TRAINABLE_AGENTS:
            out.append({"agent": key, "double": bool(payload.get("double", False))})
    return out


def load_payload(agent_key: str, double: bool) -> dict | None:
    """Find the model matching (agent_key, double); return its payload or None."""
    key = (agent_key or "").upper()
    for _, payload in _iter_models():
        same_agent = str(payload.get("agent_key", "")).upper() == key
        same_mode = bool(payload.get("double", False)) == bool(double)
        if same_agent and same_mode:
            return payload
    return None


def apply_payload(agent: Any, payload: dict) -> bool:
    """Inject saved weights into a freshly built agent. Returns True on success."""
    kind = payload.get("type")
    data = payload.get("data")
    if kind == "qtable" and hasattr(agent, "q_table"):
        agent.q_table = np.array(data)
        return True
    if kind == "dqn" and hasattr(agent, "policy_net"):
        agent.policy_net.load_state_dict(data)
        if hasattr(agent, "target_net"):
            agent.target_net.load_state_dict(data)
        return True
    return False
