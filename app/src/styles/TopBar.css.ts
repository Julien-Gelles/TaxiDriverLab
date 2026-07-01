import styled from "styled-components";
import { theme } from "./theme";

const DEMO_GREEN = "#22c55e";
const DEMO_GREEN_GLOW = "#4ade80";

export const ModeToggle = styled.div<{ $disabled: boolean }>`
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 10px;
  border: ${theme.border};
  background: ${theme.creamDark};
  opacity: ${({ $disabled }) => ($disabled ? 0.55 : 1)};
`;

export const ModeBtn = styled.button<{ $active: boolean; $mode: "train" | "demo" }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 7px;
  border: none;
  font-family: inherit;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  cursor: ${({ disabled }) => (disabled ? "default" : "pointer")};
  transition: background 0.15s ease, color 0.15s ease;

  background: ${({ $active, $mode }) =>
    $active
      ? $mode === "demo"
        ? `linear-gradient(135deg, ${DEMO_GREEN_GLOW}, ${DEMO_GREEN})`
        : `linear-gradient(135deg, ${theme.yellowGlow}, ${theme.yellow})`
      : "transparent"};
  color: ${({ $active }) => ($active ? theme.onAccent : theme.grey)};

  &:hover:not(:disabled) {
    color: ${({ $active }) => ($active ? theme.onAccent : theme.ink)};
  }
`;

export const Left = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

export const Breadcrumb = styled.span`
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  strong {
    color: ${theme.ink};
    font-weight: 700;
  }
  .sep {
    color: ${theme.grey};
    margin: 0 7px;
  }
  .mid {
    color: ${theme.grey};
    margin: 0 6px;
  }
  .agent {
    color: ${theme.grey};
    font-weight: 600;
  }
`;

export const Right = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const StatusPill = styled.span`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  border-radius: 999px;
  border: ${theme.border};
  font-size: 12px;
  font-weight: 600;
  color: ${theme.ink};
  white-space: nowrap;

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
`;

export const IconBtn = styled.button<{ $wide?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  width: ${({ $wide }) => ($wide ? "38px" : "32px")};
  padding: 0;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: ${theme.grey};
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: ${theme.ink};
    background: ${theme.creamDark};
  }
`;
