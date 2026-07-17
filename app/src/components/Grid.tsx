import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type {
  GridBoardApi,
  GridLayoutApi,
  GridPreviewRect,
  LayoutItem,
  Widget,
  WidgetCatalogEntry,
} from "../types";
import { widgetDrag, widgetLimit } from "./widgetDrag";

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

const defaultLayoutFor = (cols: number): LayoutItem[] =>
  cols <= 10 ? LAYOUT_10 : cols === 11 ? LAYOUT_11 : LAYOUT_12;

const CATALOG: Record<string, WidgetCatalogEntry> = {
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

export const WIDGET_DND_MIME = "application/x-taxi-widget";

export const Grid = () => {
  const { t } = useTranslation();
  const isPortrait = useIsPortrait();
  const { cols, rows } = useGridCount();

  const root = document.documentElement;
  const margin = theme.appMargin * 2;
  const available =
    (isPortrait ? root.clientWidth : root.clientHeight) - margin;

  const gridAreaWidth = root.clientWidth - margin - theme.gridPadding * 2;
  const cellFromWidth = gridAreaWidth / (cols + SIDEBAR_COLS);
  const cellSize = Math.min(available / 10, cellFromWidth);

  const sidebarWidth = SIDEBAR_COLS * cellSize;
  const topbarHeight = TOPBAR_ROWS * cellSize;

  const scale = cellSize / theme.designCell;

  const [usedRows, setUsedRows] = useState(0);
  const effectiveRows = Math.max(rows, usedRows);
  const { lastLayout, setLastLayout } = useSavedLayouts();

  const [widgets, setWidgets] = useState<Widget[]>(() => {
    const fromLast = lastLayout ? buildWidgets(lastLayout) : [];
    return fromLast.length ? fromLast : buildWidgets(defaultLayoutFor(cols));
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    widgets.forEach((w) => {
      const t = w.type ?? w.id;
      c[t] = (c[t] ?? 0) + 1;
    });
    return c;
  }, [widgets]);

  const canAdd = (type: string) => (counts[type] ?? 0) < widgetLimit(type);

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

  const activeCount = useMemo(
    () => Math.min(3, Math.max(1, ...Object.values(counts))),
    [counts],
  );
  const setActiveCount = useSetActiveCount();
  useEffect(() => {
    setActiveCount(activeCount);
  }, [activeCount, setActiveCount]);
  const dropSeq = useRef(0);

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
    setLayoutKey((k) => k + 1);
  }, []);

  const layoutApi = useMemo<GridLayoutApi>(
    () => ({ getCurrentLayout, applyLayout }),
    [getCurrentLayout, applyLayout],
  );

  const persistLayout = useCallback(() => {
    setLastLayout(getCurrentLayout());
  }, [setLastLayout, getCurrentLayout]);

  const [removing, setRemoving] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<GridPreviewRect | null>(null);

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
    if (!canAdd(type)) {
      setPreview(null);
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    const { x, y } = cellAt(e.clientX, e.clientY, def.w);
    setPreview((p) =>
      p && p.x === x && p.y === y && p.w === def.w && p.h === def.h
        ? p
        : { x, y, w: def.w, h: def.h },
    );
  };

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

        <SidebarTrash id="sidebar-trash" $active={removing}>
          <Trash2 size={28} className="trash-icon" />
          <span>{t("trash.label")}</span>
        </SidebarTrash>
      </AppShell>
    </GridLayoutContext.Provider>
  );
};
