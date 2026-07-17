import { useEffect, useState } from "react";
import { useIsPortrait } from "./useIsPortrait";
import { theme } from "../styles/theme";

const COLUMNS_PORTRAIT = 10;
const ROWS_LANDSCAPE = 10;

export const SIDEBAR_COLS = 4;
export const TOPBAR_ROWS = 1;

export const MIN_GRID_COLS = 10;

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

  const availW = Math.max(1, dimensions.width - MARGIN);
  const availH = Math.max(1, dimensions.height - MARGIN);

  const gridW = Math.max(1, availW - theme.gridPadding * 2);

  if (isPortrait) {
    const totalRows = Math.floor((COLUMNS_PORTRAIT * availH) / availW);
    return {
      cols: Math.max(
        MIN_GRID_COLS,
        Math.floor((COLUMNS_PORTRAIT * gridW) / availW) - SIDEBAR_COLS,
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
