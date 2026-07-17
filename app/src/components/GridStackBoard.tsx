import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GridStack, type GridStackWidget } from "gridstack";
import "gridstack/dist/gridstack.css";

import {
  GridStackArea,
  GridStackItemStyle,
  ScaledWidget,
  theme,
} from "../styles";
import type { GridStackBoardProps } from "../types";
import { VersionContext } from "../hooks";

export const GridStackBoard = ({
  columns,
  rows,
  cellSize,
  widgets,
  versionOf,
  onUsedRowsChange,
  onLayoutChange,
  onDragActiveChange,
  onRemoveWidget,
  registerApi,
}: GridStackBoardProps) => {
  const elRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<GridStack | null>(null);
  const onUsedRowsChangeRef = useRef(onUsedRowsChange);
  const onLayoutChangeRef = useRef(onLayoutChange);
  const onDragActiveChangeRef = useRef(onDragActiveChange);
  const onRemoveWidgetRef = useRef(onRemoveWidget);
  const registerApiRef = useRef(registerApi);
  const widgetsRef = useRef(widgets);
  const [contentEls, setContentEls] = useState<Record<string, HTMLElement>>({});

  useEffect(() => {
    onUsedRowsChangeRef.current = onUsedRowsChange;
  }, [onUsedRowsChange]);
  useEffect(() => {
    onLayoutChangeRef.current = onLayoutChange;
  }, [onLayoutChange]);
  useEffect(() => {
    onDragActiveChangeRef.current = onDragActiveChange;
  }, [onDragActiveChange]);
  useEffect(() => {
    onRemoveWidgetRef.current = onRemoveWidget;
  }, [onRemoveWidget]);
  useEffect(() => {
    registerApiRef.current = registerApi;
  }, [registerApi]);
  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  const assertPositions = () => {
    const grid = gridRef.current;
    if (!grid) return;
    grid.batchUpdate();
    widgetsRef.current.forEach((widget) => {
      const node = grid.engine.nodes.find((n) => n.id === widget.id);
      if (node?.el) {
        grid.update(node.el, {
          x: widget.x,
          y: widget.y,
          w: widget.w,
          h: widget.h,
        });
      }
    });
    grid.batchUpdate(false);
  };

  useEffect(() => {
    if (!elRef.current) return;

    let tearingDown = false;

    const grid = GridStack.init(
      {
        column: columns,
        cellHeight: cellSize,
        margin: 0,
        float: true,
        disableResize: true,
        animate: false,
        removable: "#sidebar-trash",
      },
      elRef.current,
    );
    gridRef.current = grid;

    const els: Record<string, HTMLElement> = {};
    grid.batchUpdate();
    widgets.forEach((widget) => {
      const item: GridStackWidget = {
        id: widget.id,
        x: widget.x,
        y: widget.y,
        w: widget.w,
        h: widget.h,
      };
      const itemEl = grid.addWidget(item);
      const content = itemEl.querySelector<HTMLElement>(
        ".grid-stack-item-content",
      );
      if (!content) return;
      if (widget.color) content.style.background = widget.color;
      if (widget.content !== undefined) els[widget.id] = content;
    });
    grid.batchUpdate(false);

    assertPositions();
    const raf = requestAnimationFrame(assertPositions);

    setContentEls(els);

    registerApiRef.current?.({
      getLayout: () =>
        grid.engine.nodes.map((n) => ({
          id: String(n.id),
          x: n.x ?? 0,
          y: n.y ?? 0,
          w: n.w ?? 1,
          h: n.h ?? 1,
        })),
    });

    const reportUsedRows = () => {
      let maxBottom = 0;
      grid.engine.nodes.forEach((n) => {
        maxBottom = Math.max(maxBottom, (n.y ?? 0) + (n.h ?? 1));
      });
      onUsedRowsChangeRef.current(maxBottom);
    };
    const onChange = () => {
      reportUsedRows();
      onLayoutChangeRef.current?.();
    };
    onChange();
    grid.on("change added removed", onChange);

    grid.on("dragstart", () => onDragActiveChangeRef.current?.(true));
    grid.on("dragstop", () => onDragActiveChangeRef.current?.(false));
    grid.on("removed", (_event, items) => {
      if (tearingDown) return;
      (items as { id?: string }[] | undefined)?.forEach((n) => {
        if (n.id != null) onRemoveWidgetRef.current?.(String(n.id));
      });
    });

    return () => {
      tearingDown = true;
      cancelAnimationFrame(raf);
      registerApiRef.current?.(null);
      setContentEls({});
      grid.removeAll(true);
      grid.destroy(false);
      gridRef.current = null;
    };
  }, []);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const present = new Set(grid.engine.nodes.map((n) => n.id));
    const toAdd = widgets.filter((w) => !present.has(w.id));
    if (toAdd.length === 0) return;

    const added: Record<string, HTMLElement> = {};
    grid.batchUpdate();
    toAdd.forEach((widget) => {
      const itemEl = grid.addWidget({
        id: widget.id,
        x: widget.x,
        y: widget.y,
        w: widget.w,
        h: widget.h,
      });
      const content = itemEl.querySelector<HTMLElement>(
        ".grid-stack-item-content",
      );
      if (!content) return;
      if (widget.color) content.style.background = widget.color;
      if (widget.content !== undefined) added[widget.id] = content;
    });
    grid.batchUpdate(false);

    if (Object.keys(added).length > 0) {
      setContentEls((prev) => ({ ...prev, ...added }));
    }
  }, [widgets]);

  useEffect(() => {
    const grid = gridRef.current;
    if (grid && grid.getColumn() !== columns) {
      grid.column(columns, "none");
      assertPositions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns]);

  useEffect(() => {
    gridRef.current?.cellHeight(cellSize);
  }, [cellSize]);

  return (
    <>
      <GridStackItemStyle />
      <GridStackArea
        ref={elRef}
        className="grid-stack"
        $width={columns * cellSize}
        $height={rows * cellSize}
      />
      {widgets.map((widget) => {
        const el = contentEls[widget.id];
        if (!el || widget.content === undefined) return null;
        const scale = cellSize / theme.designCell;
        const scaled = (
          <VersionContext.Provider value={versionOf[widget.id] ?? 0}>
            <ScaledWidget $scale={scale}>{widget.content}</ScaledWidget>
          </VersionContext.Provider>
        );
        return createPortal(scaled, el, widget.id);
      })}
    </>
  );
};
