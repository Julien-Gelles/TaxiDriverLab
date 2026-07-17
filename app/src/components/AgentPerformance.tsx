import { Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSimulation } from "../hooks";
import {
  ActionCount,
  ActionDot,
  ActionGrid,
  ActionItem,
  ActionName,
  DefautWidgetBox,
  DonutCenter,
  DonutCol,
  DonutLabel,
  DonutValue,
  DonutWrap,
  PerfBody,
  PerfHeader,
  PerfTitle,
  ProgressCircle,
  StatsCol,
  TotalIcon,
  TotalLabel,
  TotalMeta,
  TotalRow,
  TotalValue,
  theme,
} from "../styles";
import type { DonutProps } from "../types";
import { WidgetHelp } from "./WidgetHelp";
import { VersionTag } from "./VersionTag";

const DASH = "—";
const RING = 160;
const STROKE = 16;

const Donut = ({ rate, label }: DonutProps) => {
  const r = (RING - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const pct = rate ?? 0;
  return (
    <DonutWrap $size={RING}>
      <svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`}>
        <circle cx={RING / 2} cy={RING / 2} r={r} fill="none" stroke={theme.creamDark} strokeWidth={STROKE} />
        {rate != null && (
          <ProgressCircle
            cx={RING / 2}
            cy={RING / 2}
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
          />
        )}
      </svg>
      <DonutCenter>
        <DonutValue>{rate != null ? `${Math.round(pct * 100)}%` : DASH}</DonutValue>
        <DonutLabel>{label}</DonutLabel>
      </DonutCenter>
    </DonutWrap>
  );
};

export const AgentPerformance = () => {
  const { t } = useTranslation();
  const { step, episodes } = useSimulation();

  const finished = episodes.length;
  const successRate = finished ? episodes.filter((e) => e.success).length / finished : null;

  const counts = step?.actionCounts ?? [];
  const total = counts.reduce((s, n) => s + n, 0);
  const hasActions = step != null && total > 0;

  const actionColors = [theme.yellow, theme.yellowGlow, theme.yellowDark, theme.inkSoft, theme.loc[1], theme.loc[3]];
  const actionKeys = ["south", "north", "east", "west", "pickup", "dropoff"] as const;

  return (
    <DefautWidgetBox>
      <PerfHeader>
        <PerfTitle>
          <VersionTag />
          {t("performance.title")}
          <WidgetHelp content={t("performance.help")} />
        </PerfTitle>
      </PerfHeader>

      <PerfBody>
        <DonutCol>
          <Donut rate={successRate} label={t("performance.successRate")} />
        </DonutCol>

        <StatsCol>
          <TotalRow>
            <TotalIcon>
              <Zap size={15} fill="var(--accent)" color="var(--accent)" />
            </TotalIcon>
            <TotalMeta>
              <TotalLabel>{t("performance.totalActions")}</TotalLabel>
              <TotalValue>{hasActions ? total.toLocaleString() : DASH}</TotalValue>
            </TotalMeta>
          </TotalRow>

          <ActionGrid>
            {actionKeys.map((key, i) => (
              <ActionItem key={key}>
                <ActionDot $color={actionColors[i]} />
                <ActionName>{t(`performance.actions.${key}`)}</ActionName>
                <ActionCount>
                  {hasActions ? (counts[i] ?? 0).toLocaleString() : DASH}
                </ActionCount>
              </ActionItem>
            ))}
          </ActionGrid>
        </StatsCol>
      </PerfBody>
    </DefautWidgetBox>
  );
};
