import styled from "styled-components";
import { theme } from "./theme";

// ── Backdrop grid ────────────────────────────────────────────────────────────
// The static cell grid drawn behind the gridstack widgets (see Grid.tsx).

export const GridStage = styled.div`
  position: relative;
  width: fit-content;
  height: fit-content;
`;

export const GridContainer = styled.div<{
  $cols: number;
  $rows: number;
  $cellSize: number;
}>`
  display: grid;
  grid-template-columns: repeat(
    ${({ $cols }) => $cols},
    ${({ $cellSize }) => $cellSize}px
  );
  grid-template-rows: repeat(
    ${({ $rows }) => $rows},
    ${({ $cellSize }) => $cellSize}px
  );
  width: fit-content;
  height: fit-content;
  margin: auto;
`;

export const GridCell = styled.div`
  box-sizing: border-box;
  min-width: 0;
  min-height: 0;
  border: 1px solid rgba(255, 255, 255, 0.01);
`;

// Live drop target: snaps to the cell a dragged component would land on.
export const DropPreview = styled.div<{
  $x: number;
  $y: number;
  $w: number;
  $h: number;
  $cell: number;
}>`
  position: absolute;
  left: ${({ $x, $cell }) => $x * $cell}px;
  top: ${({ $y, $cell }) => $y * $cell}px;
  width: ${({ $w, $cell }) => $w * $cell}px;
  height: ${({ $h, $cell }) => $h * $cell}px;
  border: 2px dashed var(--accent);
  background: var(--accent-soft);
  border-radius: 12px;
  pointer-events: none;
  z-index: 1000;
  box-sizing: border-box;
  transition: left 0.06s ease, top 0.06s ease;
`;

// ── App shell ────────────────────────────────────────────────────────────────
// The fixed dashboard panel and its nav layers (sidebar + topbar), all driven by
// Grid.tsx. $sidebar / $topbar are pixel sizes (4 cols / 1 row worth of cells).

// The app panel: a fixed-size dark rounded surface pinned to the viewport with an
// even margin on every side, so the coloured backdrop shows all around. It never
// scrolls itself — only its inner regions do.
//
// Columns: sidebar + main. Rows: two header rows + the scrolling body. The topbar
// occupies the first header row of the main column; the sidebar header spans both
// header rows (twice the topbar's height).
export const AppShell = styled.div<{ $sidebar: number; $topbar: number }>`
  position: fixed;
  inset: ${theme.appMargin}px;
  /* Above the animated yellow backdrop. */
  z-index: 1;
  display: grid;
  grid-template-columns: ${(p) => p.$sidebar}px 1fr;
  /* Header rows: a full row (topbar / brand) + a half row (sidebar search). */
  grid-template-rows: ${(p) => p.$topbar}px ${(p) => p.$topbar * 0.5}px 1fr;
  background: ${theme.page};
  border: ${theme.border};
  border-radius: 22px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
  overflow: hidden;

  /* Ambient accent glow — a soft light zone behind the dashboard content. */
  &::before {
    content: "";
    position: absolute;
    top: -150px;
    left: 280px;
    width: 540px;
    height: 540px;
    border-radius: 50%;
    background: radial-gradient(circle, var(--accent), transparent 68%);
    opacity: 0.12;
    filter: blur(34px);
    pointer-events: none;
    z-index: 0;
  }
`;

// Sidebar header — spans both header rows (2× the topbar height). The brand sits
// in the first row band (aligned with the topbar) and the search in the second.
// No hard divider: the body below fades out under it via a mask gradient.
export const SidebarHeader = styled.div`
  grid-column: 1;
  grid-row: 1 / 3;
  border-right: ${theme.border};
  background: ${theme.page};
  position: relative;
  z-index: 1;
  overflow: hidden;
`;

// Scales the header content uniformly (zoom reflows layout, unlike transform, so
// scroll metrics stay correct). zoom resolves percentages in the pre-zoom
// coordinate space, so width/height:100% already fills the (cellSize-based) band
// — the content inside is effectively authored against designCell and zoomed to
// the live cell size, keeping every proportion identical at any window size.
export const SidebarHeaderInner = styled.div<{ $scale: number }>`
  zoom: ${({ $scale }) => $scale};
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 0 16px;
`;

// Sidebar body — scrolls independently beneath the header. The top fades out so
// content disappears smoothly under the header instead of meeting a hard line.
export const Sidebar = styled.aside`
  grid-column: 1;
  grid-row: 3;
  border-right: ${theme.border};
  background: ${theme.page};
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  z-index: 1;
  mask-image: linear-gradient(to bottom, transparent 0, #000 26px);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 26px);
`;

// Scales the nav content uniformly. zoom (not transform) is required here so the
// scroll height stays correct: the nav can grow past the viewport when menus are
// expanded, and the Sidebar must scroll it. A definite height keeps the settings
// group pinned to the bottom (its margin-top:auto) when the content is short; the
// nav overflows it and the Sidebar scrolls when expanded.
export const SidebarInner = styled.div<{ $scale: number }>`
  zoom: ${({ $scale }) => $scale};
  width: 100%;
  height: 100%;
  box-sizing: border-box;
`;

// Removal drop zone — overlays the sidebar menu (same grid cell) while a widget
// is being dragged. Dropping a widget here removes it (see gridstack `removable`
// pointing at #sidebar-trash). Inert and invisible when no drag is in progress.
export const SidebarTrash = styled.div<{ $active: boolean }>`
  grid-column: 1;
  grid-row: 3;
  z-index: 5;
  margin: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  padding: 20px;
  box-sizing: border-box;
  border-radius: 16px;
  border: 2px dashed var(--accent);
  background: ${theme.page};
  color: ${theme.ink};
  font-weight: 700;
  font-size: 14px;
  pointer-events: ${({ $active }) => ($active ? "auto" : "none")};
  opacity: ${({ $active }) => ($active ? 1 : 0)};
  transition: opacity 0.15s ease;

  /* Armed while a widget is hovering over it (gridstack adds this class), ready
     to be released and removed. */
  &.ui-droppable-over {
    background: ${theme.creamDark};
    border-color: ${theme.danger};
    color: ${theme.danger};
  }

  .trash-icon {
    color: inherit;
  }
`;

// Topbar — fixed across the top of the main column (first header row), always visible.
export const Topbar = styled.header`
  grid-column: 2;
  grid-row: 1;
  border-bottom: ${theme.border};
  background: rgba(16, 15, 11, 0.72);
  backdrop-filter: blur(8px);
  position: relative;
  z-index: 1;
  overflow: hidden;
`;

// Scales the topbar content uniformly (see SidebarHeaderInner). Hosts the flex
// row + padding that used to live on Topbar, so the spacing scales too.
export const TopbarInner = styled.div<{ $scale: number }>`
  zoom: ${({ $scale }) => $scale};
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 18px;
`;

// Main dashboard area — the only region that scrolls for the grid content. The
// padding keeps the widgets off the edges; the grid's column budget accounts for
// it (see useGridCount) so nothing overflows horizontally.
export const GridSlot = styled.div<{ $elevated?: boolean }>`
  grid-column: 2;
  grid-row: 2 / 4;
  overflow-y: auto;
  overflow-x: hidden;
  padding: ${theme.gridPadding}px;
  position: relative;
  /* While a widget is being dragged it goes position:fixed but stays in this
     stacking context, so lift the whole slot above the sidebar removal zone
     (z-index 5) — otherwise the dragged widget would pass behind it. */
  z-index: ${({ $elevated }) => ($elevated ? 20 : 1)};
`;
