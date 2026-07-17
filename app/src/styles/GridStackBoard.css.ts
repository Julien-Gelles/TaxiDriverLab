import styled, { createGlobalStyle } from "styled-components";

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

export const GridStackItemStyle = createGlobalStyle`
  .grid-stack > .grid-stack-item > .grid-stack-item-content {
    inset: 0;
    box-sizing: border-box;
    overflow: hidden;
  }
`;

export const ScaledWidget = styled.div<{ $scale: number }>`
  width: ${({ $scale }) => 100 / $scale}%;
  height: ${({ $scale }) => 100 / $scale}%;
  transform: scale(${({ $scale }) => $scale});
  transform-origin: top left;
`;
