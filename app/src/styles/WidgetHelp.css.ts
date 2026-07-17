import styled from "styled-components";
import { theme } from "./theme";

export const WidgetHelpButton = styled.button`
  flex: none;
  margin-left: 6px;
  vertical-align: middle;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: ${theme.border};
  background: ${theme.creamDark};
  color: ${theme.grey};
  font-weight: 800;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  opacity: 0;
  transition:
    opacity 0.15s ease,
    background 0.12s ease,
    color 0.12s ease;
  z-index: 20;

  &:hover {
    background: ${theme.yellow};
    color: ${theme.onAccent};
    border-color: transparent;
  }
`;
