import { createContext, useContext } from "react";
import type { LayoutItem } from "../types";

export type GridLayoutApi = {
  getCurrentLayout: () => LayoutItem[];
  applyLayout: (items: LayoutItem[]) => void;
};

export const GridLayoutContext = createContext<GridLayoutApi | null>(null);

export const useGridLayout = (): GridLayoutApi => {
  const ctx = useContext(GridLayoutContext);
  if (!ctx) {
    throw new Error("useGridLayout must be used within the Grid");
  }
  return ctx;
};
