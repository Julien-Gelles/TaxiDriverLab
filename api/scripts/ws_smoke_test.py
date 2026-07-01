"""Quick WebSocket smoke test for the simulation API.

Run the server first (from repo root):
    uvicorn api.main:app --port 8000
Then:
    python api/scripts/ws_smoke_test.py
"""

import asyncio
import json
from collections import Counter

import websockets


async def main() -> None:
    uri = "ws://127.0.0.1:8000/ws"
    async with websockets.connect(uri) as ws:
        # 1) layout on connect
        layout = json.loads(await ws.recv())
        assert layout["type"] == "layout", layout
        print("layout:", layout["rows"], "x", layout["cols"],
              "| locations:", len(layout["locations"]), "| walls:", len(layout["walls"]))

        # 2) start a short fast run
        await ws.send(json.dumps({
            "type": "start",
            "params": {"agent": "Q", "episodes": 3, "delay": 0.0, "seed": 42},
        }))

        counts: Counter = Counter()
        first_step = None
        episodes = []
        while True:
            msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=10))
            counts[msg["type"]] += 1
            if msg["type"] == "step" and first_step is None:
                first_step = msg
            if msg["type"] == "episode":
                episodes.append((msg["episode"], msg["reward"], msg["steps"], msg["success"]))
            if msg["type"] == "done":
                break

        print("message counts:", dict(counts))
        print("first step:", {k: first_step[k] for k in ("taxi", "passenger", "destination", "lastActionName", "mode")})
        print("episodes (ep, reward, steps, success):", episodes)
        assert counts["step"] > 0 and counts["episode"] == 3 and counts["done"] == 1
        print("SMOKE TEST OK")


if __name__ == "__main__":
    asyncio.run(main())
