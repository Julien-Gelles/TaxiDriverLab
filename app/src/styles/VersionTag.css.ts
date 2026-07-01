import styled from "styled-components";

// Version prefix shown before a versioned widget's title, e.g. "B - ".
export const VersionTagWrap = styled.span`
  font-weight: 800;
`;

// The version letter, coloured per version (A gold / B blue / C red).
export const VersionLetter = styled.span<{ $color: string }>`
  color: ${({ $color }) => $color};
`;

// Neutral " - " separator after the letter.
export const VersionDash = styled.span`
  opacity: 0.5;
`;
