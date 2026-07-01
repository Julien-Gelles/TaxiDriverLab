import { useEffect, useState } from "react";
import { useIsPortrait } from "./useIsPortrait";
import { theme } from "../styles/theme";

const COLUMNS_PORTRAIT = 10;
const ROWS_LANDSCAPE = 10;

// Nav layers that sit on top of the panel, sized in grid cells. The dashboard
// grid is laid out in the area left over after reserving the sidebar (left) and
// the topbar (top), so its column/row counts exclude these cells.
export const SIDEBAR_COLS = 4;
export const TOPBAR_ROWS = 1;

// The grid area never shows fewer than this many columns. On a narrow window the
// natural fit would drop to ~5 columns, so we clamp up and shrink the cells
// instead (see the cell-size computation in Grid.tsx).
export const MIN_GRID_COLS = 10;

// Space taken by the app panel's margin on both sides of each axis. The grid is
// sized to the area inside the panel, not the full viewport.
const MARGIN = theme.appMargin * 2;

export const useGridCount = (): { cols: number; rows: number } => {
  const isPortrait = useIsPortrait();
  const [dimensions, setDimensions] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  }));

  useEffect(() => {
    const update = () =>
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (dimensions.width <= 0 || dimensions.height <= 0) {
    return {
      cols: isPortrait ? COLUMNS_PORTRAIT : 1,
      rows: isPortrait ? 1 : ROWS_LANDSCAPE,
    };
  }

  // Available area inside the panel margins.
  const availW = Math.max(1, dimensions.width - MARGIN);
  const availH = Math.max(1, dimensions.height - MARGIN);

  // The dashboard area has inner padding on both sides; remove it from the
  // horizontal budget so the columns fit inside it without overflowing.
  const gridW = Math.max(1, availW - theme.gridPadding * 2);

  // Column/row counts are for the grid area only — the sidebar (4 cols) and the
  // topbar (1 row) are reserved out of the full cell count. Vertical padding is
  // absorbed by the scroll area, so it doesn't change the row count.
  if (isPortrait) {
    const totalRows = Math.floor((COLUMNS_PORTRAIT * availH) / availW);
    return {
      cols: Math.max(
        MIN_GRID_COLS,
        Math.floor((COLUMNS_PORTRAIT * gridW) / availW) - SIDEBAR_COLS
      ),
      rows: Math.max(1, totalRows - TOPBAR_ROWS),
    };
  }

  const totalCols = Math.floor((ROWS_LANDSCAPE * gridW) / availH);
  return {
    cols: Math.max(MIN_GRID_COLS, totalCols - SIDEBAR_COLS),
    rows: Math.max(1, ROWS_LANDSCAPE - TOPBAR_ROWS),
  };
};
