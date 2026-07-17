import styled from "styled-components";
import { theme } from "./theme";

const ACCENT_GRADIENT = `linear-gradient(135deg, ${theme.yellowGlow}, ${theme.yellow})`;
const ACTIVE_CARD = `linear-gradient(135deg, rgba(232,180,0,0.20), rgba(232,180,0,0.05))`;
const DEMO_GRADIENT = `linear-gradient(135deg, #4ade80, #22c55e)`;
const DEMO_ACTIVE_CARD = `linear-gradient(135deg, rgba(34,197,94,0.20), rgba(34,197,94,0.05))`;

export const PassengerToggle = styled.div`
  display: flex;
  gap: 2px;
  background: ${theme.creamDark};
  border: ${theme.border};
  border-radius: 11px;
  padding: 4px;
`;

export const PassengerBtn = styled.button<{
  $active: boolean;
  $demo: boolean;
  $locked: boolean;
}>`
  flex: 1;
  text-align: center;
  padding: 8px 0;
  border-radius: 8px;
  border: none;
  font-size: 12.5px;
  transition: all 0.15s;
  background: ${({ $active, $demo }) =>
    $active ? ($demo ? DEMO_GRADIENT : ACCENT_GRADIENT) : "transparent"};
  color: ${({ $active }) => ($active ? theme.onAccent : theme.inkSoft)};
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  cursor: ${({ $locked }) => ($locked ? "default" : "pointer")};
  opacity: ${({ $locked }) => ($locked ? 0.55 : 1)};
`;

export const AgentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  flex: 1;
  min-height: 0;
`;

export const AgentBtn = styled.button<{
  $active: boolean;
  $demo: boolean;
  $locked: boolean;
}>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: flex-start;
  justify-content: center;
  padding: 10px 12px;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.15s;
  border: 1px solid
    ${({ $active, $demo }) =>
      $active ? ($demo ? "#22c55e" : theme.yellow) : theme.line};
  background: ${({ $active, $demo }) =>
    $active ? ($demo ? DEMO_ACTIVE_CARD : ACTIVE_CARD) : theme.creamDark};
  color: ${({ $active, $demo }) =>
    $active ? ($demo ? "#4ade80" : theme.yellowGlow) : theme.inkSoft};
  cursor: ${({ $locked }) => ($locked ? "default" : "pointer")};
  opacity: ${({ $locked }) => ($locked ? 0.55 : 1)};
`;

export const PretrainedDot = styled.span`
  position: absolute;
  top: 7px;
  right: 8px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.25);
`;

export const AgentLabel = styled.span<{ $active: boolean }>`
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`;

export const AgentSub = styled.span`
  font-size: 11px;
  opacity: 0.7;
  font-weight: 600;
`;
