import { createContext, useContext } from "react";
import type { LayoutItem } from "../types";

// Bridge between the Grid (which owns the widget set + gridstack) and the
// SavedLayouts widget (rendered as a portal'd grid widget). Lets that widget
// read the current arrangement and apply a saved one without prop-drilling
// through the gridstack portal boundary.
export type GridLayoutApi = {
  // Capture the live layout (component type + cell geometry) of every widget.
  getCurrentLayout: () => LayoutItem[];
  // Replace the whole grid with the given layout, rebuilding each component.
  applyLayout: (items: LayoutItem[]) => void;
};

export const GridLayoutContext = createContext<GridLayoutApi | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useGridLayout = (): GridLayoutApi => {
  const ctx = useContext(GridLayoutContext);
  if (!ctx) {
    throw new Error("useGridLayout must be used within the Grid");
  }
  return ctx;
};
