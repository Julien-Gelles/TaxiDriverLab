import styled from "styled-components";
import { theme } from "./theme";

export const CheckerBar = styled.div`
  height: 6px;
  border-radius: 3px;
  background-image:
    linear-gradient(45deg, ${theme.onAccent} 25%, transparent 25%),
    linear-gradient(-45deg, ${theme.onAccent} 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, ${theme.onAccent} 75%),
    linear-gradient(-45deg, transparent 75%, ${theme.onAccent} 75%);
  background-size: 8px 8px;
  background-position:
    0 0,
    0 4px,
    4px -4px,
    -4px 0;
  background-color: var(--accent);
  opacity: 0.9;
`;

export const TerrainSvg = styled.svg`
  flex: 1;
  min-height: 0;
  width: 100%;
`;

export const TaxiGlyph = styled.text`
  transition:
    x 0.08s linear,
    y 0.08s linear;
`;

export const Centered = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.55;
  font-weight: 600;
`;
