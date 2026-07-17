import { useWidgetVersion, versionColor } from "../hooks";
import { VersionDash, VersionLetter, VersionTagWrap } from "../styles";

export const VersionTag = () => {
  const { index, letter, label } = useWidgetVersion();
  if (!label) return null;
  return (
    <VersionTagWrap>
      <VersionLetter $color={versionColor(index)}>{letter}</VersionLetter>
      <VersionDash> - </VersionDash>
    </VersionTagWrap>
  );
};
