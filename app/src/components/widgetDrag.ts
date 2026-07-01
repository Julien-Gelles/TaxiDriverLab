// Shared, imperative handle on the in-flight sidebar → grid drag.
//
// During a native HTML5 `dragover` the dataTransfer payload is unreadable (it is
// only exposed on `drop`, for security). The grid still needs to know which
// component is being dragged so it can render a live drop placeholder, so the
// sidebar publishes the catalog key here on dragstart and clears it on dragend.
export const widgetDrag: { type: string | null } = { type: null };

// ── Per-component instance limits ─────────────────────────────────────────────
// Each component may appear up to WIDGET_LIMIT_DEFAULT times on the grid, except
// the singletons capped at 1: speed, about/présentation, play/contrôles, the
// chrono, and the three per-episode charts (reward / steps / epsilon).
export const WIDGET_LIMIT_DEFAULT = 3;
export const WIDGET_LIMIT_OVERRIDES: Record<string, number> = {
  speed: 1,
  about: 1,
  play: 1,
  chrono: 1,
  reward: 1,
  steps: 1,
  epsilon: 1,
  saved: 1,
  layouts: 1,
};

export const widgetLimit = (type: string): number =>
  WIDGET_LIMIT_OVERRIDES[type] ?? WIDGET_LIMIT_DEFAULT;
