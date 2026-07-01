import type { ReactNode } from "react";

export type Widget = {
  id: string;
  // Catalog key shared by every instance of the same component (e.g. "terrain").
  // Used to count how many copies are on the grid against the per-component limit.
  type?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  content?: ReactNode;
};

// One widget's geometry as gridstack currently lays it out (cell coordinates).
export type GridGeometry = { id: string; x: number; y: number; w: number; h: number };

// Imperative handle the board hands back so the owner can read the live layout
// (gridstack owns positions after init, so the widget state alone is stale).
export type GridBoardApi = { getLayout: () => GridGeometry[] };

// A saveable layout entry: which components are on the grid and where, by catalog
// type (not id, so it can be rebuilt). Persistence mirrors SavedAgent.
export type LayoutItem = { type: string; x: number; y: number; w: number; h: number };
export type SavedLayout = {
  id: string;
  name: string;
  items: LayoutItem[];
  persisted: boolean;
  createdAt: number;
};

export type GridStackBoardProps = {
  columns: number;
  rows: number;
  cellSize: number;
  widgets: readonly Widget[];
  // Maps each widget id to its simulation version index (0 = A, 1 = B, 2 = C),
  // used to scope the widget's content to the right simulation slot.
  versionOf: Record<string, number>;
  // Reports the bottom-most row currently occupied by a widget (y + h), so the
  // backdrop grid can grow/shrink to always contain every widget.
  onUsedRowsChange: (usedRows: number) => void;
  // Fired whenever the arrangement changes (move/resize/add/remove), so the
  // owner can persist the live layout. Coalesced with the usedRows listener.
  onLayoutChange?: () => void;
  // Fired when a widget drag starts/stops, so the sidebar can morph into a
  // "drop here to remove" zone for the duration of the drag.
  onDragActiveChange?: (active: boolean) => void;
  // Fired after a widget is dropped onto the removal zone and taken off the grid,
  // so the owner can drop it from its widget state too.
  onRemoveWidget?: (id: string) => void;
  // Hands the owner an imperative API (read the live layout) on mount; null on
  // unmount. Lets the layout-save widget capture the current arrangement.
  registerApi?: (api: GridBoardApi | null) => void;
};
