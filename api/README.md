# Taxi Driver — Simulation API

FastAPI + WebSocket bridge between the Python simulation (`core/`, Gymnasium
Taxi-v4) and the React dashboard (`app/`). It runs a simulation in a background
thread and streams the **decoded** environment state so the browser
draws the 5×5 grid itself — no pygame, no pixel streaming.

## Setup

Run everything from the **repository root** (so `core` is importable).

```bash
# from the repo root
python -m venv .venv
# Windows (PowerShell): .\.venv\Scripts\Activate.ps1
# Windows (cmd):        .venv\Scripts\activate.bat
# Linux/macOS:          source .venv/bin/activate

pip install -r api/requirements.txt
```

## Run

```bash
# from the repo root
uvicorn api.main:app --reload --port 8000
```

- `GET  /health` → `{"status": "ok"}`
- `GET  /layout` → static Taxi-v4 map (rows, cols, locations, walls)
- `WS   /ws` → live simulation stream

## WebSocket protocol

**Client → server**

| Message                                    | Effect                                                                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `{"type": "start", "params": {...}}`       | Start a run. `params`: `agent` (`Q`/`B`/`R`), `episodes`, `delay` (s/step), `alpha`, `gamma`, `epsilon`, `seed`. |
| `{"type": "pause"}` / `{"type": "resume"}` | Pause / resume.                                                                                                  |
| `{"type": "speed", "delay": 0.05}`         | Change the per-step delay (lower = faster).                                                                      |
| `{"type": "stop"}`                         | Stop the current run.                                                                                            |

**Server → client**

| Message                                                                                                                                                       | When                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `{"type": "layout", ...}`                                                                                                                                     | On connect (static map).               |
| `{"type": "started", "agent", "episodes", "learns"}`                                                                                                          | Run begins.                            |
| `{"type": "step", "taxi": {"row","col"}, "passenger", "destination", "reward", "lastAction", "lastActionName", "epsilon", "mode", "step", "episode", "done"}` | Each step (throttled at full speed).   |
| `{"type": "episode", "episode", "reward", "steps", "epsilon", "success"}`                                                                                     | End of each episode (feed the charts). |
| `{"type": "done", "stopped"}`                                                                                                                                 | Run finished.                          |
