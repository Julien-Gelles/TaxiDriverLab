import styled from "styled-components";
import { theme } from "./theme";

export const SpeedRow = styled.div`
  box-sizing: border-box;
  height: calc(100% - 6px);
  width: calc(100% - 6px);
  margin: 3px;
  padding: 0 18px;
  border: ${theme.border};
  border-radius: ${theme.radius}px;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 30px;
  overflow: hidden;

  /* The help "?" lives inside the header; reveal it when the widget is hovered
     (it no longer sits inside DefautWidgetBox which used to do this). */
  &:hover [data-widget-help] {
    opacity: 1;
  }
`;

export const SpeedHeader = styled.div`
  flex: none;
  display: flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${theme.grey};
  white-space: nowrap;
`;

export const SpeedTrack = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const SpeedTrackBar = styled.div<{ $disabled?: boolean }>`
  position: relative;
  height: 6px;
  margin: 9px 2px;
  border-radius: 4px;
  background: ${theme.creamDark};
  cursor: ${({ $disabled }) => ($disabled ? "default" : "pointer")};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
`;

export const SpeedTicks = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
`;

export const SpeedTick = styled.span`
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: ${theme.ink};
  opacity: 0.25;
`;

export const SpeedThumb = styled.div<{
  $percent: number;
  $disabled?: boolean;
  $dragging?: boolean;
}>`
  position: absolute;
  top: 50%;
  left: ${({ $percent }) => $percent}%;
  width: 16px;
  height: 16px;
  margin-left: -8px;
  margin-top: -8px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-glow), var(--accent));
  border: 3px solid ${theme.page};
  box-shadow: 0 0 10px var(--accent-soft);
  cursor: ${({ $disabled }) => ($disabled ? "default" : "grab")};
  touch-action: none;
  transition: ${({ $dragging }) => ($dragging ? "none" : "left 0.18s ease")};

  &:active {
    cursor: ${({ $disabled }) => ($disabled ? "default" : "grabbing")};
  }
`;

export const SpeedLabels = styled.div`
  display: flex;
  align-items: stretch;
  gap: 3px;
  padding: 3px;
  border-radius: 10px;
  background: transparent;
`;

export const SpeedLabelButton = styled.button<{ $active: boolean }>`
  flex: 1 1 0;
  min-width: 0;
  padding: 5px 6px;
  border: none;
  border-radius: 7px;
  font-family: inherit;
  font-size: 11px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  background: ${({ $active }) =>
    $active
      ? `linear-gradient(135deg, var(--accent-glow), var(--accent))`
      : "transparent"};
  color: ${({ $active }) => ($active ? theme.onAccent : theme.grey)};
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &:hover:not(:disabled) {
    color: ${({ $active }) => ($active ? theme.onAccent : theme.ink)};
    background: ${({ $active }) =>
      $active
        ? `linear-gradient(135deg, var(--accent-glow), var(--accent))`
        : theme.cream};
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`;
