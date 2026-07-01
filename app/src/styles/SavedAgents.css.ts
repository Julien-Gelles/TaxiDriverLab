import styled from "styled-components";
import { theme } from "./theme";

// Save row: name field + action buttons.
export const SavedForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const SavedInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: ${theme.ink};
  padding: 8px 11px;
  border: ${theme.border};
  border-radius: 9px;
  background: ${theme.creamDark};
  transition: border-color 0.15s ease;

  &::placeholder {
    color: ${theme.grey};
    font-weight: 500;
  }
  &:focus {
    outline: none;
    border-color: var(--accent);
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

export const SavedActions = styled.div`
  display: flex;
  gap: 6px;
`;

export const SavedBtn = styled.button`
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  padding: 7px 8px;
  border-radius: 9px;
  border: ${theme.border};
  background: ${theme.creamDark};
  color: ${theme.inkSoft};
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.12s ease, border-color 0.12s ease, background 0.12s ease;

  &:hover:not(:disabled) {
    color: ${theme.ink};
    border-color: var(--accent);
  }
  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`;

// Hint shown when no saveable (tabular) model is available yet.
export const SavedHint = styled.div`
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  color: ${theme.grey};
`;

// Grid of saved-agent cards (the "slots").
export const SavedList = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  flex: 1;
  min-height: 0;
  align-content: start;
  overflow-y: auto;
`;

export const SavedEmpty = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  opacity: 0.5;
  font-size: 12px;
  font-weight: 600;
  padding: 8px;
`;

// A card is a div (not a button) because it hosts the export/delete icon
// buttons — a button cannot legally nest another button.
export const SavedCard = styled.div<{
  $active: boolean;
  $demo: boolean;
  $selectable: boolean;
}>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: stretch;
  text-align: left;
  padding: 9px 10px;
  border-radius: 11px;
  overflow: hidden;
  transition: all 0.15s ease;
  border: 1px solid
    ${({ $active, $demo }) =>
      $active ? ($demo ? "#22c55e" : theme.yellow) : theme.line};
  background: ${({ $active, $demo }) =>
    $active
      ? $demo
        ? "rgba(34,197,94,0.14)"
        : "rgba(232,180,0,0.16)"
      : theme.creamDark};
  color: ${theme.ink};
  cursor: ${({ $selectable }) => ($selectable ? "pointer" : "default")};
  opacity: ${({ $selectable, $active }) => ($selectable || $active ? 1 : 0.6)};

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }
  .name {
    font-size: 12.5px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .sub {
    font-size: 11px;
    font-weight: 600;
    color: ${theme.grey};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ops {
    display: flex;
    gap: 4px;
    margin-top: 2px;
  }
`;

// Origin tag: localStorage-backed vs file/session slot.
export const OriginBadge = styled.span<{ $persisted: boolean }>`
  flex: none;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 999px;
  color: ${({ $persisted }) => ($persisted ? theme.onAccent : theme.inkSoft)};
  background: ${({ $persisted }) =>
    $persisted ? "var(--accent)" : "rgba(255,255,255,0.06)"};
`;

// Small per-card icon button (export / delete).
export const IconMini = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 7px;
  border: ${theme.border};
  background: transparent;
  color: ${theme.grey};
  cursor: pointer;
  transition: color 0.12s ease, border-color 0.12s ease, background 0.12s ease;

  &:hover {
    color: ${({ $danger }) => ($danger ? theme.danger : theme.ink)};
    border-color: ${({ $danger }) => ($danger ? theme.danger : "var(--accent)")};
  }
`;
