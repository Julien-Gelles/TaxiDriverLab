import styled from "styled-components";
import { theme } from "./theme";

export const ControlStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 9px;
  flex: 1;
  min-height: 0;
`;

export const ControlChip = styled.div`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(21, 20, 15, 0.16);
  color: ${theme.onAccent};
  font-weight: 800;
  font-size: 13px;
`;

export const ControlSubtitle = styled.div`
  color: rgba(21, 20, 15, 0.72);
  font-size: 13px;
  font-weight: 600;
`;

export const ControlEpisode = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  color: ${theme.onAccent};

  .num {
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1;
  }
  .total {
    font-size: 13px;
    font-weight: 600;
    color: rgba(21, 20, 15, 0.65);
  }
`;

export const ControlProgress = styled.div`
  height: 8px;
  border-radius: 999px;
  background: rgba(21, 20, 15, 0.18);
  overflow: hidden;
`;
export const ControlProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: ${theme.onAccent};
  border-radius: 999px;
  transition: width 0.3s ease;
`;

export const ControlButtons = styled.div`
  display: flex;
  gap: 10px;
  flex: 1;
  min-height: 44px;
`;

const controlButtonBase = `
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 14px;
  background: ${theme.onAccent};
  color: ${theme.ink};
  font-family: inherit;
  cursor: pointer;
  transition: filter 0.15s ease, transform 0.08s ease;

  &:hover:not(:disabled) {
    filter: brightness(1.25);
  }
  &:active:not(:disabled) {
    transform: translateY(1px);
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

export const PrimaryButton = styled.button`
  ${controlButtonBase}
  flex: 3;
  min-width: 0;
  gap: 12px;
  font-size: 15px;
  font-weight: 700;
`;

export const SecondaryButton = styled.button`
  ${controlButtonBase}
  flex: 1;
  min-width: 0;
`;

export const ControlIconBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-glow), var(--accent));
  color: ${theme.onAccent};
  flex: none;
`;

export const ControlFooter = styled.div`
  color: rgba(21, 20, 15, 0.72);
  font-size: 12px;
  font-weight: 600;
`;
