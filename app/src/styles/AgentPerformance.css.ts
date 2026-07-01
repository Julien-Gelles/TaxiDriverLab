import styled from "styled-components";
import { theme } from "./theme";

// ── Success donut ────────────────────────────────────────────────────────────

export const DonutWrap = styled.div<{ $size: number }>`
  position: relative;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  flex: none;
`;

export const ProgressCircle = styled.circle`
  transition: stroke-dashoffset 0.4s ease;
`;

export const DonutCenter = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

export const DonutValue = styled.span`
  font-size: 38px;
  font-weight: 800;
  line-height: 1;
  color: ${theme.ink};
`;

export const DonutLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${theme.grey};
  margin-top: 5px;
`;

// ── Card layout ──────────────────────────────────────────────────────────────

export const PerfHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

export const PerfTitle = styled.span`
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 700;
`;

export const PerfBody = styled.div`
  display: flex;
  align-items: stretch;
  gap: 16px;
  flex: 1;
  min-height: 0;
`;

export const DonutCol = styled.div`
  flex: 4 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const StatsCol = styled.div`
  flex: 6 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 14px;
`;

// ── Total actions row ────────────────────────────────────────────────────────

export const TotalRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const TotalIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: ${theme.creamDark};
  flex: none;
`;

export const TotalMeta = styled.div`
  display: flex;
  flex-direction: column;
  line-height: 1.1;
`;

export const TotalLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${theme.grey};
`;

export const TotalValue = styled.span`
  font-size: 18px;
  font-weight: 800;
  color: ${theme.ink};
`;

// ── Action breakdown ─────────────────────────────────────────────────────────

export const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 18px;
  row-gap: 8px;
`;

export const ActionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  min-width: 0;
`;

export const ActionDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex: none;
`;

export const ActionName = styled.span`
  color: ${theme.inkSoft};
  flex: 1;
  white-space: nowrap;
`;

export const ActionCount = styled.span`
  font-weight: 700;
  color: ${theme.ink};
`;
