import { useEffect, useRef, useState} from "react";
import { createPortal } from "react-dom";
import { GridStack, type GridStackWidget } from "gridstack";
import "gridstack/dist/gridstack.css";

import { GridStackArea, GridStackItemStyle, ScaledWidget, theme } from "../styles";
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

  // Keep the latest callback/widgets in refs (the init effect runs only once).
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

  // Pin every widget to its canonical (valid, non-overlapping) geometry. Used to
  // recover from gridstack's occasional cold-start mis-placement and after the
  // column count changes.
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

  // Initialise Gridstack once.
  // Gridstack owns the widget DOM and uses its native vertical push for collisions.
  useEffect(() => {
    if (!elRef.current) return;

    // Guards the 'removed' handler: gridstack fires it for every widget during
    // teardown (removeAll), which must not call back into the unmounting owner.
    let tearingDown = false;

    const grid = GridStack.init(
      {
        column: columns,
        cellHeight: cellSize,
        margin: 0,
        float: true,
        disableResize: true,
        animate: false,
        // Dragging a widget onto the sidebar's drop zone removes it.
        removable: "#sidebar-trash",
      },
      elRef.current
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
        ".grid-stack-item-content"
      );
      if (!content) return;
      if (widget.color) content.style.background = widget.color;
      if (widget.content !== undefined) els[widget.id] = content;
    });
    grid.batchUpdate(false);

    // addWidget can mis-place items during the initial batch insert — on a cold
    // start the grid sometimes lays out before column/cell sizing has settled,
    // scattering widgets into a tall single stack. Re-assert every widget's
    // intended geometry from the canonical (valid, non-overlapping) coordinates.
    // Run it synchronously now and again on the next frame, once gridstack has
    // finished its internal layout, so the final positions are deterministic.
    assertPositions();
    const raf = requestAnimationFrame(assertPositions);

    setContentEls(els);

    // Expose a live read of the current layout (gridstack owns positions after
    // init, so the owner's widget state is stale once anything is dragged).
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

    // Track the lowest occupied row and report it up, so the grid can add
    // rows when widgets overflow and drop them again once freed.
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

    // Surface widget drags so the sidebar can turn into a removal drop zone.
    grid.on("dragstart", () => onDragActiveChangeRef.current?.(true));
    grid.on("dragstop", () => onDragActiveChangeRef.current?.(false));
    // When a widget is dropped onto the removal zone, gridstack takes it off the
    // grid and fires 'removed' — sync it out of the owner's widget state too.
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
    // Init runs once; live updates are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mount widgets added after init (e.g. dragged in from the sidebar). Only the
  // newcomers are inserted; existing nodes keep their live gridstack positions.
  // Removal isn't handled yet — the board is append-only for now.
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
        ".grid-stack-item-content"
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

  // Keep the column count aligned with the responsive backdrop grid. Changing the
  // column count can shuffle positions, so re-pin them afterwards.
  useEffect(() => {
    const grid = gridRef.current;
    if (grid && grid.getColumn() !== columns) {
      grid.column(columns, "none");
      assertPositions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns]);

  // Keep square cells: cell height tracks the backdrop cell size.
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
        // Uniformly scale the content so it keeps identical proportions at any
        // window size. Every widget shares the same factor (cellSize / designCell)
        // because each widget's pixel box already scales with cellSize while its
        // cell ratio stays fixed. The inner box is sized at 1/scale so that, once
        // scaled, it exactly fills the (fixed-ratio) widget content box.
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
