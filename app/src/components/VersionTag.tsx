import { useWidgetVersion, versionColor } from "../hooks";
import { VersionDash, VersionLetter, VersionTagWrap } from "../styles";

// Renders the version prefix shown before a versioned widget's title, e.g.
// "B - ". Renders nothing when there is only one active version. The letter is
// coloured per version (A gold / B blue / C red); the " - " stays neutral so
// the result reads as "B - Statistiques".
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
