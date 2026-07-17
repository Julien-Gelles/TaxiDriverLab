import type { ReactNode } from "react";

export type GridCount = { cols: number; rows: number };

export type GridPreviewRect = { x: number; y: number; w: number; h: number };

export type Widget = {
  id: string;
  type?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  content?: ReactNode;
};

export type GridGeometry = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type GridBoardApi = { getLayout: () => GridGeometry[] };

export type WidgetCatalogEntry = {
  w: number;
  h: number;
  make: () => ReactNode;
};

export type WidgetDragState = { type: string | null };

export type LayoutItem = {
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
};
export type SavedLayout = {
  id: string;
  name: string;
  items: LayoutItem[];
  persisted: boolean;
  createdAt: number;
};

export type GridLayoutApi = {
  getCurrentLayout: () => LayoutItem[];
  applyLayout: (items: LayoutItem[]) => void;
};

export type LayoutSaveInput = {
  name: string;
  items: LayoutItem[];
};

export type SavedLayoutsContextValue = {
  layouts: SavedLayout[];
  maxSlots: number;
  hasFreeSlot: boolean;
  saveLocal: (input: LayoutSaveInput) => boolean;
  saveFile: (input: LayoutSaveInput) => void;
  exportFile: (id: string) => void;
  importFile: (file: File) => Promise<boolean>;
  remove: (id: string) => void;
  lastLayout: LayoutItem[] | null;
  setLastLayout: (items: LayoutItem[]) => void;
};

export type GridStackBoardProps = {
  columns: number;
  rows: number;
  cellSize: number;
  widgets: readonly Widget[];
  versionOf: Record<string, number>;
  onUsedRowsChange: (usedRows: number) => void;
  onLayoutChange?: () => void;
  onDragActiveChange?: (active: boolean) => void;
  onRemoveWidget?: (id: string) => void;
  registerApi?: (api: GridBoardApi | null) => void;
};
