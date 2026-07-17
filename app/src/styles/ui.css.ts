import styled from "styled-components";
import { theme } from "./theme";

export const DefautWidgetBox = styled.div<{ $color?: string }>`
  box-sizing: border-box;
  height: calc(100% - 6px);
  width: calc(100% - 6px);
  margin: 3px;
  padding: 16px 18px;
  border: ${theme.border};
  border-radius: ${theme.radius}px;
  background: ${({ $color }) => $color ?? theme.cream};
  color: ${theme.ink};
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  position: relative;
  transition: border-color 0.15s ease;

  &:hover {
    border-color: rgba(255, 255, 255, 0.13);
  }

  &:hover [data-widget-help] {
    opacity: 1;
  }
`;

export const WidgetTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: -0.01em;
  color: ${theme.ink};
`;

export const MutedText = styled.span`
  color: ${theme.grey};
  font-size: 12px;
  font-weight: 600;
`;
