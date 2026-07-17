import type { ReactNode } from "react";

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
