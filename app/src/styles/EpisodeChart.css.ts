import styled from "styled-components";
import { theme } from "./theme";

export const ChartArea = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;
`;

export const ChartSvg = styled.svg`
  width: 100%;
  height: 100%;
  overflow: visible;
`;

export const ChartLegend = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  gap: 8px;
  padding: 2px 4px;
  pointer-events: none;
`;

export const LegendItem = styled.span<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 800;
  color: ${({ $color }) => $color};
`;

export const Swatch = styled.span<{ $color: string; $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
  display: inline-block;
`;

export const ChartTooltip = styled.div<{ $left: number; $top: number }>`
  position: absolute;
  left: ${({ $left }) => $left}%;
  top: ${({ $top }) => $top}%;
  transform: translate(-50%, -130%);
  pointer-events: none;
  white-space: nowrap;
  background: ${theme.creamDark};
  border: 1px solid ${theme.line};
  border-radius: 6px;
  padding: 3px 7px;
  font-size: 10px;
  font-weight: 700;
  color: ${theme.ink};
  box-shadow: ${theme.shadowSm};
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

export const TooltipEp = styled.span`
  opacity: 0.7;
`;

export const TooltipRow = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const TooltipLetter = styled.span<{ $color: string }>`
  color: ${({ $color }) => $color};
  font-weight: 800;
`;

export const ChartEmpty = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.5;
  font-weight: 600;
`;
