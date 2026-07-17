import styled from "styled-components";
import { theme } from "./theme";

export const QTitleRow = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const FrozenBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #4ade80;
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.25);
  border-radius: 6px;
  padding: 2px 7px;
`;

export const CanvasWrap = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;
  background: ${theme.page};
  border: 1px solid ${theme.line};
  border-radius: 6px;
  overflow: hidden;
`;

export const QCanvas = styled.canvas`
  width: 100%;
  height: 100%;
  display: block;
`;

export const ActionRow = styled.div`
  display: flex;
  justify-content: space-around;
  font-size: 10px;
  font-weight: 700;
  opacity: 0.7;
`;

export const LegendRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
`;

export const LegendMin = styled.span`
  color: #3b82f6;
  font-weight: 700;
`;

export const LegendBar = styled.div`
  flex: 1;
  height: 8px;
  border-radius: 4px;
  border: 1px solid ${theme.ink};
  background: linear-gradient(90deg, #3b82f6, #100f0b, var(--accent));
`;

export const LegendMax = styled.span`
  color: var(--accent);
  font-weight: 700;
`;

export const QEmpty = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  opacity: 0.55;
  font-weight: 600;
  padding: 12px;
`;
