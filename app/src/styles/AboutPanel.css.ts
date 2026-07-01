import styled from "styled-components";
import { theme } from "./theme";

// Banner layout: taxi image on the left, title + description on the right.
export const AboutRow = styled.div`
  box-sizing: border-box;
  height: 100%;
  width: 100%;
  padding: 16px 21px;
  display: flex;
  align-items: center;
  gap: 16px;
  overflow: hidden;
`;

export const AboutImg = styled.img`
  height: 100%;
  max-height: 100%;
  flex: none;
  object-fit: contain;
`;

export const AboutText = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
`;

export const AboutTitle = styled.h2`
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${theme.ink};
`;

export const AboutDescription = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: ${theme.inkSoft};
  max-width: 640px;
`;
