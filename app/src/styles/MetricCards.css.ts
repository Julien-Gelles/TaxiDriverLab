import styled from "styled-components";
import { theme } from "./theme";

export const MetricHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
`;

export const MetricTitle = styled.span`
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: ${theme.grey};
`;

export const MetricValueRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex: 1;
  min-height: 0;
`;

export const MetricValue = styled.span`
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1;
  color: ${theme.ink};
`;

export const MetricSuffix = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${theme.grey};
`;

export const MetricDelta = styled.div<{ $color: string }>`
  font-size: 12px;
  font-weight: 700;
  color: ${({ $color }) => $color};
`;

export const SparkSvg = styled.svg`
  flex: none;
  overflow: visible;
`;
