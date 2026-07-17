import styled from "styled-components";
import { theme } from "./theme";

export const FieldRow = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: ${theme.creamDark};
  border: ${theme.border};
  border-radius: 11px;
  padding: 9px 12px;
  font-size: 13px;
  font-weight: 600;
  color: ${theme.inkSoft};
`;

export const NumberInput = styled.input`
  width: 58px;
  font-family: inherit;
  font-weight: 700;
  font-size: 13px;
  text-align: right;
  color: ${theme.ink};
  font-variant-numeric: tabular-nums;
  padding: 4px 9px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: rgba(0, 0, 0, 0.28);
  transition: border-color 0.15s ease;

  &:focus {
    outline: none;
    border-color: var(--accent);
  }
  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
`;

export const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  flex: 1;
  align-content: start;
`;

export const FrozenBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 11px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.25);
  color: #4ade80;
  font-size: 12px;
  font-weight: 700;
`;
