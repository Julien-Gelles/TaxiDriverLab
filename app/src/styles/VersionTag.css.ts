import styled from "styled-components";

export const VersionTagWrap = styled.span`
  font-weight: 800;
`;

export const VersionLetter = styled.span<{ $color: string }>`
  color: ${({ $color }) => $color};
`;

export const VersionDash = styled.span`
  opacity: 0.5;
`;
