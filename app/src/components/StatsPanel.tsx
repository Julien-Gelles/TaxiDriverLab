import { useTranslation } from "react-i18next";

import { useSimulation, useSimConfig, SPEED_PRESETS } from "../hooks";
import { DefautWidgetBox, StatList, StatRow, StatusPill, WidgetTitle } from "../styles";
import { WidgetHelp } from "./WidgetHelp";
import { VersionTag } from "./VersionTag";
import { statusInfo } from "./TopBar";

export const StatsPanel = () => {
  const { t } = useTranslation();
  const { step, status, connected } = useSimulation();
  const { speedIndex, delay, mode } = useSimConfig();
  const isDemo = mode === "demo";

  const speedTKey = SPEED_PRESETS[speedIndex]?.tKey;
  const speedLabel = speedTKey ? t(speedTKey) : "—";
  const speedDisplay = delay === 0 ? `${speedLabel}` : `${speedLabel} (${delay.toFixed(2)}s)`;

  const epsilonDisplay = isDemo
    ? t("stats.frozenEpsilon")
    : step?.epsilon != null
      ? step.epsilon.toFixed(4)
      : step
        ? t("stats.na")
        : "—";

  const modeDisplay = isDemo
    ? t("stats.frozenExploit")
    : step
      ? step.mode === "explore"
        ? t("stats.exploration")
        : t("stats.exploitation")
      : "—";

  const rows: [string, string][] = [
    [t("stats.episode"), step ? `${step.episode} / ${step.episodes}` : "—"],
    [t("stats.step"), step ? String(step.step) : "—"],
    [t("stats.reward"), step ? step.reward.toFixed(1) : "—"],
    [t("stats.epsilon"), epsilonDisplay],
    [t("stats.mode"), modeDisplay],
    [t("stats.lastAction"), step ? step.lastActionName : "—"],
    [t("stats.speed"), speedDisplay],
  ];

  const { text: statusText, color: statusColor } = statusInfo(connected ? status : "disconnected", t);

  return (
    <DefautWidgetBox>
      <WidgetTitle>
        <span>
          <VersionTag />
          {t("stats.title")}
          <WidgetHelp content={t("stats.help")} />
        </span>
        <StatusPill>
          <span className="dot" style={{ background: statusColor }} />
          {statusText}
        </StatusPill>
      </WidgetTitle>
      <StatList>
        {rows.map(([label, value]) => (
          <StatRow key={label}>
            <span>{label}</span>
            <span>{value}</span>
          </StatRow>
        ))}
      </StatList>
    </DefautWidgetBox>
  );
};
