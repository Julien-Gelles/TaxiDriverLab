import type { WidgetDragState } from "../types";

export const widgetDrag: WidgetDragState = { type: null };

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
