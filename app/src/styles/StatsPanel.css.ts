import styled from "styled-components";
import { theme } from "./theme";

// Vertical list wrapping the live-stats rows.
export const StatList = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

// Live-stats row — label + tabular value, separated by a hairline.
export const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 9px 0;
  border-bottom: ${theme.border};
  font-size: 13px;
  font-weight: 700;
  color: ${theme.ink};
  font-variant-numeric: tabular-nums;

  &:last-child {
    border-bottom: none;
  }
  & > span:first-child {
    color: ${theme.inkSoft};
    font-weight: 600;
  }
`;
