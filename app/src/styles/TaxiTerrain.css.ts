import styled from "styled-components";
import { theme } from "./theme";

// Iconic taxi checker strip — a subtle accent stripe under the terrain title.
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

// The terrain map itself, filling the remaining card height.
export const TerrainSvg = styled.svg`
  flex: 1;
  min-height: 0;
  width: 100%;
`;

// The taxi glyph — eased between cells as it moves.
export const TaxiGlyph = styled.text`
  transition: x 0.08s linear, y 0.08s linear;
`;

// Centered placeholder shown while connecting / waiting.
export const Centered = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.55;
  font-weight: 600;
`;
