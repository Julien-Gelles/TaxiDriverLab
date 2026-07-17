import styled from "styled-components";
import { theme } from "./theme";

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
  transition:
    left 0.06s ease,
    top 0.06s ease;
`;

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

export const SidebarHeader = styled.div`
  grid-column: 1;
  grid-row: 1 / 3;
  border-right: ${theme.border};
  background: ${theme.page};
  position: relative;
  z-index: 1;
  overflow: hidden;
`;

export const SidebarHeaderInner = styled.div<{ $scale: number }>`
  zoom: ${({ $scale }) => $scale};
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 0 16px;
`;

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

export const SidebarInner = styled.div<{ $scale: number }>`
  zoom: ${({ $scale }) => $scale};
  width: 100%;
  height: 100%;
  box-sizing: border-box;
`;

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
