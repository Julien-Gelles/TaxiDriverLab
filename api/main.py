"""
FastAPI app exposing the Taxi-v3 simulation over a WebSocket.

Run from the repository root (so ``core`` is importable):

    uvicorn api.main:app --reload

Protocol
--------
Client -> server (JSON):
    {"type": "start", "params": {"agent": "Q", "episodes": 20, "delay": 0.25,
                                   "alpha": 0.1, "gamma": 0.99, "epsilon": 1.0,
                                   "seed": 42}}
    {"type": "pause"} / {"type": "resume"}
    {"type": "speed", "delay": 0.05}
    {"type": "stop"}

Server -> client (JSON):
    {"type": "layout", ...}                 # static map, sent on connect
    {"type": "started", "agent", "episodes", "learns", "hasQTable", "isNeural"}
    {"type": "step", "taxi", "passenger", "destination", "reward", ...}
    {"type": "qtable", "q": [[...]], "lastState"}     # live Q-table heatmap
    {"type": "activations", "embedding", "hidden", "output"}  # DQN only
    {"type": "weights", "fc1", "fc2"}                 # DQN only, less frequent
    {"type": "episode", "episode", "reward", "steps", "epsilon", "success"}
    {"type": "done", "stopped"}
"""

import asyncio

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .session import SimulationSession
from .taxi import LAYOUT
from . import pretrained as pt

app = FastAPI(title="Taxi Driver Simulation API")

# At high speed the worker thread produces frames far faster than the WebSocket
# can flush them. Bound the queue and drop *stale* high-frequency frames so the
# on-screen state stays close to real time and pause/stop react immediately.
# Lifecycle messages (episode/done/started/layout) are never dropped.
QUEUE_MAXSIZE = 64
FRAME_TYPES = frozenset({"step", "qtable", "activations", "weights"})

# The React app runs on a different origin (Vite dev server); allow it.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/layout")
async def layout() -> dict:
    """The static Taxi-v3 map, for clients that prefer REST over the WS message."""
    return LAYOUT


@app.get("/pretrained")
async def pretrained_list() -> list:
    """List pretrained models in core/save/ that demo mode can run."""
    return pt.list_available()


@app.websocket("/ws")
async def ws(websocket: WebSocket) -> None:
    await websocket.accept()
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue(maxsize=QUEUE_MAXSIZE)

    def _evict_oldest_frame() -> bool:
        # Remove the stalest high-frequency frame from anywhere in the buffer so
        # a fresher message can take its place. Lifecycle messages (episode/done/
        # started/layout) are never touched. Returns True if a frame was dropped.
        # Safe to mutate the deque directly: both this and the drain coroutine run
        # on the event loop thread and never yield mid-operation.
        buf = queue._queue  # asyncio.Queue's underlying collections.deque
        for i, m in enumerate(buf):
            if m.get("type") in FRAME_TYPES:
                del buf[i]
                return True
        return False

    # Gate for high-frequency frames. Closed on pause/stop so that step frames
    # the worker is still flushing — including ones whose call_soon_threadsafe
    # callbacks were scheduled while session.stop() blocked the loop on join() —
    # are discarded instead of replayed. Lifecycle messages (started/episode/
    # done/layout) always pass, so no state or counter update is ever lost.
    gate = {"frames": True}

    def _enqueue(message: dict) -> None:
        # Runs on the event loop thread (via call_soon_threadsafe), so reading
        # and mutating the queue here needs no lock.
        if message.get("type") in FRAME_TYPES and not gate["frames"]:
            return
        if queue.full():
            # Backlog: bias the buffer toward the freshest frames by discarding
            # the *oldest* stale frame, never the incoming one. This guarantees
            # the latest frame (e.g. the final step of a run) is delivered, so
            # live counters like the episode index land on their true final value
            # instead of freezing a few episodes short.
            if not _evict_oldest_frame():
                # Only lifecycle messages are queued — never drop those. If the
                # incoming message is itself a droppable frame, skip it; otherwise
                # evict the oldest to keep the queue bounded.
                if message.get("type") in FRAME_TYPES:
                    return
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
        queue.put_nowait(message)

    def _drop_pending_frames() -> None:
        # Discard buffered frames so a pause/stop doesn't keep replaying stale
        # steps; keep lifecycle messages (episode/done) so no data is lost.
        kept = []
        while not queue.empty():
            try:
                kept.append(queue.get_nowait())
            except asyncio.QueueEmpty:
                break
        for m in kept:
            if m.get("type") not in FRAME_TYPES:
                queue.put_nowait(m)

    # Bridge: the simulation runs in a thread; hop messages back onto the loop.
    def emit(message: dict) -> None:
        loop.call_soon_threadsafe(_enqueue, message)

    session = SimulationSession(emit)
    await websocket.send_json({"type": "layout", **LAYOUT})

    async def drain() -> None:
        while True:
            message = await queue.get()
            await websocket.send_json(message)

    sender = asyncio.create_task(drain())
    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("type")
            if action == "start":
                gate["frames"] = True
                session.start(data.get("params", {}))
            elif action == "pause":
                gate["frames"] = False
                session.pause()
                _drop_pending_frames()
            elif action == "resume":
                gate["frames"] = True
                session.resume()
            elif action == "speed":
                session.set_delay(data.get("delay", 0.25))
            elif action == "stop":
                # Close the gate first so any frames the worker flushes while
                # stop() joins the thread are dropped, then clear what's buffered.
                gate["frames"] = False
                session.stop()
                _drop_pending_frames()
    except WebSocketDisconnect:
        pass
    finally:
        # Stop the worker off the event loop so join() doesn't block it.
        await asyncio.to_thread(session.stop)
        sender.cancel()
