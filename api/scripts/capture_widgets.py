"""One-off helper: screenshot every dashboard widget, in training and demo.

Drives the live React app (Vite) + simulation API through Playwright. It first
injects a layout that contains *every* component (the curated default layouts
omit some), forces French, then:

  1. runs a short Q-learning training at Max speed and saves a tight PNG of each
     widget to ``app/src/assets/components/<id>.png`` (sidebar thumbnails);
  2. switches to demo mode, runs a 30-episode Q-learning demo, and saves the
     green variant to ``<id>-demo.png`` (used by the sidebar in demo mode).

Run from the repo root with BOTH servers already up (Vite on 5173, API on 8000):
    .venv/Scripts/python.exe api/scripts/capture_widgets.py
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

APP_URL = "http://localhost:5173/"
OUT_DIR = Path(__file__).resolve().parents[2] / "app" / "src" / "assets" / "components"
EPISODES_TRAIN = 800
EPISODES_DEMO = 30

# A layout holding every component, so each one is on the grid to be captured
# (the app's default layouts are curated and omit several). Positions don't need
# to be perfect — each widget is screenshotted by its own box.
FULL_LAYOUT = [
    {"type": "about", "x": 0, "y": 0, "w": 9, "h": 3},
    {"type": "agent", "x": 11, "y": 0, "w": 5, "h": 4},
    {"type": "terrain", "x": 0, "y": 4, "w": 7, "h": 7},
    {"type": "stats", "x": 7, "y": 3, "w": 4, "h": 4},
    {"type": "hyper", "x": 11, "y": 4, "w": 5, "h": 3},
    {"type": "play", "x": 7, "y": 8, "w": 4, "h": 3},
    {"type": "speed", "x": 0, "y": 3, "w": 7, "h": 1},
    {"type": "qtable", "x": 0, "y": 11, "w": 4, "h": 8},
    {"type": "network", "x": 4, "y": 11, "w": 8, "h": 6},
    {"type": "reward", "x": 11, "y": 10, "w": 5, "h": 4},
    {"type": "steps", "x": 11, "y": 14, "w": 5, "h": 4},
    {"type": "epsilon", "x": 11, "y": 18, "w": 5, "h": 4},
    {"type": "m-steps-total", "x": 0, "y": 22, "w": 3, "h": 2},
    {"type": "m-reward", "x": 3, "y": 22, "w": 3, "h": 2},
    {"type": "m-epsilon", "x": 6, "y": 22, "w": 3, "h": 2},
    {"type": "m-steps", "x": 9, "y": 22, "w": 3, "h": 2},
    {"type": "m-reward-max", "x": 12, "y": 22, "w": 2, "h": 2},
    {"type": "m-steps-min", "x": 14, "y": 22, "w": 2, "h": 2},
    {"type": "performance", "x": 0, "y": 24, "w": 7, "h": 4},
    {"type": "chrono", "x": 7, "y": 24, "w": 3, "h": 2},
    {"type": "saved", "x": 10, "y": 24, "w": 6, "h": 4},
    {"type": "layouts", "x": 10, "y": 28, "w": 6, "h": 4},
]


def log(msg: str) -> None:
    print(f"[capture] {msg}", flush=True)


def wait_connected(page: Page) -> None:
    """Wait until the simulation websocket is connected (a Lancer button enabled)."""
    page.wait_for_function(
        "() => { const b = [...document.querySelectorAll('button')]"
        ".find(x => x.textContent.trim().startsWith('Lancer')); return b && !b.disabled; }",
        timeout=30_000,
    )


def set_episodes(page: Page, value: int) -> None:
    """Fill the first number input of the Hyperparams widget (episodes)."""
    page.locator('[gs-id="hyper"] input[type=number]').first.fill(str(value))


def run_and_wait(page: Page, launch_label: str, total: int) -> None:
    """Click a launch button (exact label) and wait until the run reaches `total`."""
    page.get_by_role("button", name="Max", exact=True).click()
    page.get_by_role("button", name=launch_label, exact=True).click()
    # Wait for the new run to reset the episode counter, so we don't mistake the
    # previous run's final count for an already-finished run.
    try:
        page.wait_for_function(
            "(t) => { const n = document.querySelector('[gs-id=\"play\"] .num');"
            " return n && parseInt(n.textContent) < t; }",
            arg=total,
            timeout=6000,
        )
    except Exception:  # noqa: BLE001
        pass
    deadline = time.time() + 240
    last = -1
    while time.time() < deadline:
        cur = page.evaluate(
            "() => { const n = document.querySelector('[gs-id=\"play\"] .num');"
            " return n ? parseInt(n.textContent) : -1; }"
        )
        if cur != last:
            log(f"  episode {cur}/{total}")
            last = cur
        if cur >= total:
            break
        time.sleep(0.4)
    else:
        log("  WARNING: run did not reach the target before timeout")
    time.sleep(2)  # let the final frame / charts settle


def capture_all(page: Page, suffix: str) -> None:
    """Screenshot every on-grid widget to <id><suffix>.png."""
    ids = page.evaluate(
        "() => [...document.querySelectorAll('.grid-stack-item')]"
        ".map(e => e.getAttribute('gs-id'))"
    )
    log(f"capturing {len(ids)} widgets (suffix='{suffix}'): {ids}")
    for wid in ids:
        if not wid:
            continue
        el = page.locator(f'.grid-stack-item[gs-id="{wid}"] .grid-stack-item-content')
        try:
            el.scroll_into_view_if_needed()
            time.sleep(0.15)
            out = OUT_DIR / f"{wid}{suffix}.png"
            el.screenshot(path=str(out))
            log(f"  saved {out.name}")
        except Exception as exc:  # noqa: BLE001
            log(f"  FAILED {wid}: {exc}")


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(
            viewport={"width": 2400, "height": 1300},
            device_scale_factor=2,
            locale="fr-FR",
        )
        page.goto(APP_URL, wait_until="networkidle")

        # Force French + load a layout containing every component, then reload.
        page.evaluate(
            "(layout) => { localStorage.setItem('taxi_lang','fr');"
            " localStorage.setItem('taxi_last_layout', JSON.stringify(layout)); }",
            FULL_LAYOUT,
        )
        page.reload(wait_until="networkidle")

        log("waiting for connection…")
        wait_connected(page)

        # ── Training pass ────────────────────────────────────────────────────
        page.get_by_role("button", name="Entraînement", exact=True).click()
        page.get_by_role("button", name="Q-Learning").click()
        set_episodes(page, EPISODES_TRAIN)
        log(f"training {EPISODES_TRAIN} episodes…")
        run_and_wait(page, "Lancer", EPISODES_TRAIN)
        capture_all(page, "")

        # ── Demo pass (green variants) ───────────────────────────────────────
        page.get_by_role("button", name="Démo", exact=True).click()
        page.get_by_role("button", name="Q-Learning").click()
        set_episodes(page, EPISODES_DEMO)
        log(f"demo {EPISODES_DEMO} episodes…")
        run_and_wait(page, "Lancer démo", EPISODES_DEMO)
        capture_all(page, "-demo")

        browser.close()

    log(f"done -> {OUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
