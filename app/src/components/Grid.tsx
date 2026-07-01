import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  GridStackBoard,
  TaxiTerrain,
  AboutPanel,
  AgentChoice,
  SavedAgents,
  SavedLayouts,
  HyperParams,
  StatsPanel,
  PlayControls,
  SpeedSlider,
  QTablePanel,
  NetworkPanel,
  EpisodeChart,
  TotalStepsMetric,
  RewardMetric,
  EpsilonMetric,
  StepsMetric,
  RewardMaxMetric,
  StepsMinMetric,
  AgentPerformance,
  Chrono,
  TopBarContent,
  SidebarHeaderContent,
  SidebarNav,
  SidebarProvider,
  WidgetCountProvider,
} from "./";
import {
  useIsPortrait,
  useGridCount,
  useSetActiveCount,
  useSavedLayouts,
  GridLayoutContext,
  type GridLayoutApi,
  SIDEBAR_COLS,
  TOPBAR_ROWS,
} from "../hooks";
import {
  AppShell,
  DropPreview,
  GridCell,
  GridContainer,
  GridSlot,
  GridStage,
  Sidebar,
  SidebarHeader,
  SidebarHeaderInner,
  SidebarInner,
  SidebarTrash,
  Topbar,
  TopbarInner,
  theme,
} from "../styles";
import type { GridBoardApi, LayoutItem, Widget } from "../types";
import { widgetDrag, widgetLimit } from "./widgetDrag";

// Default grid layouts, picked by the responsive column count (see
// defaultLayoutFor): the natural grid width is 10, 11, or 12+ columns depending
// on the viewport, and each gets a layout authored for that width. Each entry is
// a component type + cell geometry; buildWidgets turns it into live widgets.
const LAYOUT_10: LayoutItem[] = [
  { type: "about", x: 0, y: 0, w: 9, h: 3 },
  { type: "speed", x: 0, y: 3, w: 7, h: 1 },
  { type: "m-steps-total", x: 7, y: 3, w: 3, h: 2 },
  { type: "terrain", x: 0, y: 4, w: 7, h: 7 },
  { type: "m-reward", x: 7, y: 5, w: 3, h: 2 },
  { type: "m-epsilon", x: 7, y: 7, w: 3, h: 2 },
  { type: "m-steps", x: 7, y: 9, w: 3, h: 2 },
  { type: "qtable", x: 0, y: 11, w: 4, h: 8 },
  { type: "m-steps-min", x: 4, y: 11, w: 2, h: 2 },
  { type: "play", x: 6, y: 11, w: 4, h: 3 },
  { type: "m-reward-max", x: 4, y: 13, w: 2, h: 2 },
  { type: "agent", x: 5, y: 15, w: 5, h: 4 },
  { type: "hyper", x: 0, y: 19, w: 5, h: 3 },
  { type: "chrono", x: 6, y: 19, w: 3, h: 2 },
];

const LAYOUT_11: LayoutItem[] = [
  { type: "about", x: 0, y: 0, w: 9, h: 3 },
  { type: "speed", x: 0, y: 3, w: 7, h: 1 },
  { type: "chrono", x: 8, y: 3, w: 3, h: 2 },
  { type: "terrain", x: 0, y: 4, w: 7, h: 7 },
  { type: "play", x: 7, y: 5, w: 4, h: 3 },
  { type: "qtable", x: 7, y: 8, w: 4, h: 8 },
  { type: "agent", x: 0, y: 11, w: 5, h: 4 },
  { type: "m-reward-max", x: 5, y: 12, w: 2, h: 2 },
  { type: "m-steps-min", x: 5, y: 14, w: 2, h: 2 },
  { type: "hyper", x: 0, y: 15, w: 5, h: 3 },
  { type: "m-steps-total", x: 5, y: 16, w: 3, h: 2 },
  { type: "m-steps", x: 8, y: 16, w: 3, h: 2 },
];

const LAYOUT_12: LayoutItem[] = [
  { type: "about", x: 0, y: 0, w: 9, h: 3 },
  { type: "chrono", x: 9, y: 1, w: 3, h: 2 },
  { type: "speed", x: 0, y: 3, w: 7, h: 1 },
  { type: "agent", x: 7, y: 3, w: 5, h: 4 },
  { type: "terrain", x: 0, y: 4, w: 7, h: 7 },
  { type: "hyper", x: 7, y: 7, w: 5, h: 3 },
  { type: "play", x: 8, y: 10, w: 4, h: 3 },
  { type: "m-steps-total", x: 0, y: 11, w: 3, h: 2 },
  { type: "m-steps", x: 3, y: 11, w: 3, h: 2 },
  { type: "m-reward-max", x: 6, y: 11, w: 2, h: 2 },
  { type: "m-reward", x: 0, y: 13, w: 3, h: 2 },
  { type: "m-steps-min", x: 3, y: 13, w: 2, h: 2 },
  { type: "performance", x: 5, y: 13, w: 7, h: 4 },
  { type: "qtable", x: 0, y: 16, w: 4, h: 8 },
  { type: "reward", x: 6, y: 17, w: 5, h: 4 },
  { type: "steps", x: 6, y: 21, w: 5, h: 4 },
];

// The default arrangement for the current responsive width: 10 cols, 11 cols, or
// 12-and-wider. cols never drops below MIN_GRID_COLS (10).
const defaultLayoutFor = (cols: number): LayoutItem[] =>
  cols <= 10 ? LAYOUT_10 : cols === 11 ? LAYOUT_11 : LAYOUT_12;

// Catalogue of components that can be dragged from the sidebar onto the grid.
// Keyed by the sidebar item id (see COMPONENT_MENUS in SideBar.tsx); each entry
// gives a default footprint and a factory for a fresh React instance. Duplicates
// are allowed, so every drop mints a new instance.
type CatalogEntry = { w: number; h: number; make: () => ReactNode };

const CATALOG: Record<string, CatalogEntry> = {
  about: { w: 11, h: 3, make: () => <AboutPanel /> },
  agent: { w: 5, h: 4, make: () => <AgentChoice /> },
  saved: { w: 6, h: 4, make: () => <SavedAgents /> },
  layouts: { w: 6, h: 4, make: () => <SavedLayouts /> },
  terrain: { w: 7, h: 7, make: () => <TaxiTerrain /> },
  stats: { w: 4, h: 4, make: () => <StatsPanel /> },
  hyper: { w: 5, h: 3, make: () => <HyperParams /> },
  play: { w: 4, h: 3, make: () => <PlayControls /> },
  speed: { w: 7, h: 1, make: () => <SpeedSlider /> },
  qtable: { w: 4, h: 8, make: () => <QTablePanel /> },
  network: { w: 8, h: 6, make: () => <NetworkPanel /> },
  reward: { w: 5, h: 4, make: () => <EpisodeChart metric="reward" /> },
  steps: { w: 5, h: 4, make: () => <EpisodeChart metric="steps" /> },
  epsilon: { w: 5, h: 4, make: () => <EpisodeChart metric="epsilon" /> },
  "m-steps-total": { w: 3, h: 2, make: () => <TotalStepsMetric /> },
  "m-reward": { w: 3, h: 2, make: () => <RewardMetric /> },
  "m-epsilon": { w: 3, h: 2, make: () => <EpsilonMetric /> },
  "m-steps": { w: 3, h: 2, make: () => <StepsMetric /> },
  "m-reward-max": { w: 2, h: 2, make: () => <RewardMaxMetric /> },
  "m-steps-min": { w: 2, h: 2, make: () => <StepsMinMetric /> },
  performance: { w: 7, h: 4, make: () => <AgentPerformance /> },
  chrono: { w: 3, h: 2, make: () => <Chrono /> },
};

// Turn a layout (component type + geometry) into live widgets, minting content
// from the catalog. Each type appears once in the default layouts, so the type
// doubles as the widget id (drops use "type-<seq>", so no collision).
const buildWidgets = (items: LayoutItem[]): Widget[] =>
  items.flatMap((it) => {
    const def = CATALOG[it.type];
    if (!def) return [];
    return [
      {
        id: it.type,
        type: it.type,
        x: it.x,
        y: it.y,
        w: it.w,
        h: it.h,
        content: def.make(),
      },
    ];
  });

// MIME type used to carry the dragged component's catalog key.
export const WIDGET_DND_MIME = "application/x-taxi-widget";

export const Grid = () => {
  const { t } = useTranslation();
  const isPortrait = useIsPortrait();
  const { cols, rows } = useGridCount();

  // One cell = 1/10 of the main axis of the area *inside* the app panel margins.
  // Use clientWidth/clientHeight (which exclude the scrollbars) rather than
  // innerWidth/innerHeight, so the grid never overshoots and triggers a phantom
  // scroll on the cross axis — notably the horizontal scroll seen in portrait.
  const root = document.documentElement;
  const margin = theme.appMargin * 2;
  const available =
    (isPortrait ? root.clientWidth : root.clientHeight) - margin;

  // One cell is normally 1/10 of the main cross axis. But the grid area must
  // always show at least MIN_GRID_COLS columns (see useGridCount): when the
  // window is too narrow to fit the sidebar plus those columns at that size, we
  // shrink the cells so the whole row still fits horizontally instead.
  const gridAreaWidth = root.clientWidth - margin - theme.gridPadding * 2;
  const cellFromWidth = gridAreaWidth / (cols + SIDEBAR_COLS);
  const cellSize = Math.min(available / 10, cellFromWidth);

  // Nav layers reserve whole cells out of the panel: the sidebar is 4 cells wide
  // (full height), the topbar 1 cell tall (across the main column).
  const sidebarWidth = SIDEBAR_COLS * cellSize;
  const topbarHeight = TOPBAR_ROWS * cellSize;

  // Same uniform scale the widgets use (see GridStackBoard): the topbar/sidebar
  // contents are authored against designCell and zoomed to the live cell size so
  // they stay proportional at any window size. Heights passed into the scaled
  // content are expressed in design pixels (÷scale) so they map back to actual.
  const scale = cellSize / theme.designCell;

  // Lowest row occupied by a widget is calculated.
  // The grid grows below the responsive base row count when widgets overflow.
  // Shrinks back as soon as those extra rows are freed.
  const [usedRows, setUsedRows] = useState(0);
  const effectiveRows = Math.max(rows, usedRows);

  // The last-used arrangement (auto-persisted to localStorage) and a setter to
  // keep it current. Read before Grid mounts, so it's available in the
  // initializer below.
  const { lastLayout, setLastLayout } = useSavedLayouts();

  // Live widget set. On load: the last-used layout from localStorage if any,
  // otherwise the default layout for the current responsive width (10 / 11 / 12+
  // columns). The width is read once at mount, so a later resize doesn't wipe the
  // user's arrangement. Each base widget's id is its catalog type.
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    const fromLast = lastLayout ? buildWidgets(lastLayout) : [];
    return fromLast.length ? fromLast : buildWidgets(defaultLayoutFor(cols));
  });

  // How many copies of each component type are currently on the grid, so the
  // sidebar can show "used / max" and block adding past the per-type limit.
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    widgets.forEach((w) => {
      const t = w.type ?? w.id;
      c[t] = (c[t] ?? 0) + 1;
    });
    return c;
  }, [widgets]);

  const canAdd = (type: string) => (counts[type] ?? 0) < widgetLimit(type);

  // Version (simulation slot) of each widget = its index among same-type widgets
  // in creation order: 1st → 0 (A), 2nd → 1 (B), 3rd → 2 (C). All widgets sharing
  // a version index are wired to the same simulation.
  const versionOf = useMemo(() => {
    const seen: Record<string, number> = {};
    const map: Record<string, number> = {};
    widgets.forEach((w) => {
      const t = w.type ?? w.id;
      const v = seen[t] ?? 0;
      map[w.id] = Math.min(v, 2);
      seen[t] = v + 1;
    });
    return map;
  }, [widgets]);

  // Number of active simulations = how many versions exist = the largest count of
  // any single component type (capped at 3). Reported up so idle slots stay off.
  const activeCount = useMemo(
    () => Math.min(3, Math.max(1, ...Object.values(counts))),
    [counts],
  );
  const setActiveCount = useSetActiveCount();
  useEffect(() => {
    setActiveCount(activeCount);
  }, [activeCount, setActiveCount]);
  // Monotonic counter so dropped duplicates always get a unique id.
  const dropSeq = useRef(0);

  // ── Layout save / restore ──────────────────────────────────────────────────
  // The live board API (set by GridStackBoard on mount) lets us read the current
  // positions, which gridstack owns after init. Applying a saved layout rebuilds
  // the widgets and bumps a remount key so the board re-initialises at the new
  // geometry.
  const boardApiRef = useRef<GridBoardApi | null>(null);
  const widgetsRef = useRef(widgets);
  widgetsRef.current = widgets;
  const [layoutKey, setLayoutKey] = useState(0);

  const getCurrentLayout = useCallback((): LayoutItem[] => {
    const live = boardApiRef.current?.getLayout();
    const typeById = new Map(
      widgetsRef.current.map((w) => [w.id, w.type ?? w.id]),
    );
    const source =
      live ??
      widgetsRef.current.map((w) => ({
        id: w.id,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
      }));
    return source.flatMap((n) => {
      const type = typeById.get(n.id);
      return type && CATALOG[type]
        ? [{ type, x: n.x, y: n.y, w: n.w, h: n.h }]
        : [];
    });
  }, []);

  const applyLayout = useCallback((items: LayoutItem[]) => {
    const next: Widget[] = items.flatMap((it) => {
      const def = CATALOG[it.type];
      if (!def) return [];
      return [
        {
          id: `${it.type}-${++dropSeq.current}`,
          type: it.type,
          x: it.x,
          y: it.y,
          w: it.w,
          h: it.h,
          content: def.make(),
        },
      ];
    });
    if (next.length === 0) return;
    setWidgets(next);
    setLayoutKey((k) => k + 1); // force the board to re-init at the new positions
  }, []);

  const layoutApi = useMemo<GridLayoutApi>(
    () => ({ getCurrentLayout, applyLayout }),
    [getCurrentLayout, applyLayout],
  );

  // Persist the live arrangement whenever it changes (move/resize/add/remove/
  // load), so the next reload restores exactly what's on screen.
  const persistLayout = useCallback(() => {
    setLastLayout(getCurrentLayout());
  }, [setLastLayout, getCurrentLayout]);

  // True while a widget is being dragged on the grid: the sidebar morphs into a
  // "drop to remove" zone for the duration.
  const [removing, setRemoving] = useState(false);
  // GridStage shares its top-left origin with the backdrop grid, so its rect maps
  // pixel drop coordinates straight to grid cells.
  const stageRef = useRef<HTMLDivElement>(null);
  // Snapped cell the dragged component would land on; drives the drop placeholder.
  const [preview, setPreview] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  // Where a footprint of size `w` lands when dropped at a pixel point — snapped
  // to a cell and kept fully on the grid.
  const cellAt = (clientX: number, clientY: number, w: number) => {
    const rect = stageRef.current!.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(Math.floor((clientX - rect.left) / cellSize), cols - w),
    );
    const y = Math.max(0, Math.floor((clientY - rect.top) / cellSize));
    return { x, y };
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setPreview(null);
    const type =
      e.dataTransfer.getData(WIDGET_DND_MIME) ||
      e.dataTransfer.getData("text/plain");
    const def = CATALOG[type];
    if (!def || !stageRef.current) return;
    // Enforce the per-component limit (defensive: maxed items aren't draggable).
    if (!canAdd(type)) return;

    const { x, y } = cellAt(e.clientX, e.clientY, def.w);
    const id = `${type}-${++dropSeq.current}`;
    setWidgets((prev) => [
      ...prev,
      { id, type, x, y, w: def.w, h: def.h, content: def.make() },
    ]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    const type = widgetDrag.type;
    const def = type ? CATALOG[type] : undefined;
    if (!def || !type || !stageRef.current) return;
    // At the per-component limit: refuse the drop (no preventDefault) and hide
    // the placeholder so it's visually clear the component can't be added.
    if (!canAdd(type)) {
      setPreview(null);
      return;
    }
    // Allow the drop, show the copy cursor, and move the placeholder.
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    const { x, y } = cellAt(e.clientX, e.clientY, def.w);
    setPreview((p) =>
      p && p.x === x && p.y === y && p.w === def.w && p.h === def.h
        ? p
        : { x, y, w: def.w, h: def.h },
    );
  };

  // Clear the placeholder when the pointer leaves the grid or the drag ends
  // anywhere (including a drop outside the grid).
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setPreview(null);
    }
  };
  useEffect(() => {
    const clear = () => setPreview(null);
    window.addEventListener("dragend", clear);
    return () => window.removeEventListener("dragend", clear);
  }, []);

  return (
    <GridLayoutContext.Provider value={layoutApi}>
      <AppShell $sidebar={sidebarWidth} $topbar={topbarHeight}>
        <SidebarProvider>
          <WidgetCountProvider counts={counts}>
            <SidebarHeader>
              <SidebarHeaderInner $scale={scale}>
                <SidebarHeaderContent rowHeight={topbarHeight / scale} />
              </SidebarHeaderInner>
            </SidebarHeader>
            <Sidebar>
              <SidebarInner $scale={scale}>
                <SidebarNav />
              </SidebarInner>
            </Sidebar>
          </WidgetCountProvider>
        </SidebarProvider>
        <Topbar>
          <TopbarInner $scale={scale}>
            <TopBarContent />
          </TopbarInner>
        </Topbar>
        <GridSlot $elevated={removing}>
          <GridStage
            ref={stageRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <GridContainer
              $cols={cols}
              $rows={effectiveRows}
              $cellSize={cellSize}
            >
              {Array.from({ length: cols * effectiveRows }, (_, i) => (
                <GridCell key={i} />
              ))}
            </GridContainer>

            <GridStackBoard
              key={layoutKey}
              columns={cols}
              rows={effectiveRows}
              cellSize={cellSize}
              widgets={widgets}
              versionOf={versionOf}
              onUsedRowsChange={setUsedRows}
              onLayoutChange={persistLayout}
              onDragActiveChange={setRemoving}
              onRemoveWidget={(id) =>
                setWidgets((prev) => prev.filter((w) => w.id !== id))
              }
              registerApi={(api) => {
                boardApiRef.current = api;
              }}
            />

            {/* Live drop target: snaps to the cell the dragged component will land on. */}
            {preview && (
              <DropPreview
                $x={preview.x}
                $y={preview.y}
                $w={preview.w}
                $h={preview.h}
                $cell={cellSize}
              />
            )}
          </GridStage>
        </GridSlot>

        {/* Removal zone overlaying the sidebar menu while a widget is dragged. */}
        <SidebarTrash id="sidebar-trash" $active={removing}>
          <Trash2 size={28} className="trash-icon" />
          <span>{t("trash.label")}</span>
        </SidebarTrash>
      </AppShell>
    </GridLayoutContext.Provider>
  );
};
