import styled, { createGlobalStyle } from "styled-components";

// The gridstack root that owns the widget DOM (see GridStackBoard.tsx). Sized to
// the backdrop grid so its drop coordinates map straight to cells.
export const GridStackArea = styled.div<{
  $height: number;
  $width: number;
}>`
  position: absolute;
  top: 0;
  left: 0;
  background: transparent;
  height: ${({ $height }) => $height}px;
  width: ${({ $width }) => $width}px;
`;

// Global tweak for gridstack's own item-content boxes.
export const GridStackItemStyle = createGlobalStyle`
  .grid-stack > .grid-stack-item > .grid-stack-item-content {
    inset: 0;
    box-sizing: border-box;
    overflow: hidden;
  }
`;

// Uniformly scales a widget's content so it keeps identical proportions at any
// window size. The inner box is sized at 1/scale so that, once scaled, it exactly
// fills the (fixed-ratio) widget content box.
export const ScaledWidget = styled.div<{ $scale: number }>`
  width: ${({ $scale }) => 100 / $scale}%;
  height: ${({ $scale }) => 100 / $scale}%;
  transform: scale(${({ $scale }) => $scale});
  transform-origin: top left;
`;
