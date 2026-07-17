import styled from "styled-components";
import { theme } from "./theme";

export const ChronoHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const ChronoTitle = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${theme.grey};
`;

export const ChronoBody = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const ChronoClock = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
  padding: 10px 22px;
  border-radius: 14px;
  border: 1.5px solid var(--accent);
  box-shadow: 0 0 18px var(--accent-soft);
`;

export const ChronoSeg = styled.span<{ $dim?: boolean }>`
  font-size: ${({ $dim }) => ($dim ? 28 : 40)}px;
  font-weight: 800;
  line-height: 1;
  color: ${({ $dim }) => ($dim ? theme.inkSoft : theme.ink)};
  align-self: center;
`;

export const ChronoSep = styled.span`
  font-size: 34px;
  font-weight: 300;
  color: ${theme.grey};
  margin-bottom: 4px;
`;

export const ChronoDot = styled.span`
  font-size: 28px;
  font-weight: 300;
  color: ${theme.grey};
  margin-bottom: 2px;
`;
