import { createContext, useContext } from "react";
import type { GridLayoutApi } from "../types";

export const GridLayoutContext = createContext<GridLayoutApi | null>(null);

export const useGridLayout = (): GridLayoutApi => {
  const ctx = useContext(GridLayoutContext);
  if (!ctx) {
    throw new Error("useGridLayout must be used within the Grid");
  }
  return ctx;
};
