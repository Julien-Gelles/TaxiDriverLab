import styled from "styled-components";

// Fills the card body with the network graph SVG.
export const GraphBox = styled.div`
  flex: 1;
  min-height: 0;
`;

export const GraphSvg = styled.svg`
  width: 100%;
  height: 100%;
`;

// Centered placeholder (DQN-only / waiting states).
export const NetworkEmpty = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  opacity: 0.55;
  font-weight: 600;
  padding: 12px;
`;
