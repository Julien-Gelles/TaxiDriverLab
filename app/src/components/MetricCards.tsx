import { useId, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useSimulation } from "../hooks";
import {
  DefautWidgetBox,
  MetricDelta,
  MetricHeader,
  MetricSuffix,
  MetricTitle,
  MetricValue,
  MetricValueRow,
  SparkSvg,
  theme,
} from "../styles";
import type {
  MetricCardProps,
  MetricDeltaInfo,
  MetricDeltaOptions,
  RunSummary,
  SparklineProps,
} from "../types";
import { movingAverage, smoothWindow } from "../utils/smooth";
import { WidgetHelp } from "./WidgetHelp";
import { VersionTag } from "./VersionTag";

const DASH = "—";

const SPARK_W = 78;
const SPARK_H = 34;

const Sparkline = ({ series, color }: SparklineProps) => {
  const gradId = useId();
  const geo = useMemo(() => {
    const raw = series.filter((v) => Number.isFinite(v));
    const pts = movingAverage(raw, smoothWindow(raw.length));
    if (pts.length < 2) return null;
    let min = Math.min(...pts);
    let max = Math.max(...pts);
    if (min === max) { min -= 1; max += 1; }
    const sx = (i: number) => (i / (pts.length - 1)) * SPARK_W;
    const sy = (v: number) => SPARK_H - ((v - min) / (max - min)) * SPARK_H;
    const path = pts.map((v, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
    const area = `${path} L${SPARK_W},${SPARK_H} L0,${SPARK_H} Z`;
    return { path, area };
  }, [series]);

  if (!geo) return null;
  return (
    <SparkSvg width={SPARK_W} height={SPARK_H} viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={geo.area} fill={`url(#${gradId})`} stroke="none" />
      <path d={geo.path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </SparkSvg>
  );
};

const buildDelta = (
  summaries: RunSummary[],
  pick: (s: RunSummary) => number | null,
  { higherIsBetter, digits }: MetricDeltaOptions,
  vsPrev: string
): MetricDeltaInfo => {
  const last = summaries.at(-1);
  const prev = summaries.at(-2);
  if (!last || !prev) return { text: DASH, color: theme.grey };
  const a = pick(last);
  const b = pick(prev);
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) {
    return { text: DASH, color: theme.grey };
  }
  const diff = a - b;
  const same = Math.abs(diff) < 0.5 * 10 ** -digits;
  const arrow = same ? "→" : diff > 0 ? "↑" : "↓";
  const sign = diff > 0 ? "+" : diff < 0 ? "−" : "±";
  const color = same
    ? theme.grey
    : diff > 0 === higherIsBetter
      ? theme.success
      : theme.danger;
  return { text: `${arrow} ${sign}${Math.abs(diff).toFixed(digits)} ${vsPrev}`, color };
};

const MetricCard = ({
  title,
  value,
  suffix,
  series,
  color = "var(--accent)",
  delta,
  help,
}: MetricCardProps) => (
  <DefautWidgetBox>
    <MetricHeader>
      <MetricTitle>
        <VersionTag />
        {title}
        <WidgetHelp content={help} />
      </MetricTitle>
      {series && <Sparkline series={series} color={color} />}
    </MetricHeader>

    <MetricValueRow>
      <MetricValue>{value}</MetricValue>
      {suffix && <MetricSuffix>{suffix}</MetricSuffix>}
    </MetricValueRow>

    <MetricDelta $color={delta.color}>{delta.text}</MetricDelta>
  </DefautWidgetBox>
);

const mean = (xs: number[]) => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;

export const TotalStepsMetric = () => {
  const { t } = useTranslation();
  const { step, episodes, runSummaries } = useSimulation();
  const hasData = step != null || episodes.length > 0;
  const doneSteps = episodes.reduce((s, e) => s + e.steps, 0);
  const liveSteps = step && step.episode >= episodes.length ? step.step : 0;
  const total = doneSteps + liveSteps;
  let running = 0;
  const series = episodes.map((e) => (running += e.steps));
  return (
    <MetricCard
      title={t("metrics.totalSteps.title")}
      value={hasData ? total.toLocaleString() : DASH}
      suffix={t("metrics.totalSteps.suffix")}
      series={series}
      color="var(--accent)"
      delta={buildDelta(runSummaries, (s) => s.totalSteps, { higherIsBetter: false, digits: 0 }, t("metrics.vsPrev"))}
      help={t("metrics.totalSteps.help")}
    />
  );
};

export const RewardMetric = () => {
  const { t } = useTranslation();
  const { step, episodes, runSummaries } = useSimulation();
  const rewards = episodes.map((e) => e.reward);
  const hasData = step != null || rewards.length > 0;
  const avg = rewards.length ? mean(rewards) : step?.reward ?? 0;
  return (
    <MetricCard
      title={t("metrics.reward.title")}
      value={hasData ? avg.toFixed(1) : DASH}
      suffix={t("metrics.reward.suffix")}
      series={rewards}
      color="var(--accent)"
      delta={buildDelta(runSummaries, (s) => s.avgReward, { higherIsBetter: true, digits: 1 }, t("metrics.vsPrev"))}
      help={t("metrics.reward.help")}
    />
  );
};

export const EpsilonMetric = () => {
  const { t } = useTranslation();
  const { step, episodes, runSummaries } = useSimulation();
  const eps = step?.epsilon ?? episodes.at(-1)?.epsilon ?? null;
  const series = episodes.map((e) => e.epsilon).filter((v): v is number => v != null);
  return (
    <MetricCard
      title={t("metrics.epsilon.title")}
      value={eps != null ? eps.toFixed(3) : DASH}
      suffix={t("metrics.epsilon.suffix")}
      series={series}
      color={theme.loc[3]}
      delta={buildDelta(runSummaries, (s) => s.lastEpsilon, { higherIsBetter: false, digits: 3 }, t("metrics.vsPrev"))}
      help={t("metrics.epsilon.help")}
    />
  );
};

export const StepsMetric = () => {
  const { t } = useTranslation();
  const { step, episodes, runSummaries } = useSimulation();
  const steps = episodes.map((e) => e.steps);
  const hasData = step != null || steps.length > 0;
  const avg = steps.length ? mean(steps) : step?.step ?? 0;
  return (
    <MetricCard
      title={t("metrics.avgSteps.title")}
      value={hasData ? avg.toFixed(0) : DASH}
      suffix={t("metrics.avgSteps.suffix")}
      series={steps}
      color="var(--accent-dark)"
      delta={buildDelta(runSummaries, (s) => s.avgSteps, { higherIsBetter: false, digits: 0 }, t("metrics.vsPrev"))}
      help={t("metrics.avgSteps.help")}
    />
  );
};

export const RewardMaxMetric = () => {
  const { t } = useTranslation();
  const { episodes, runSummaries } = useSimulation();
  const rewards = episodes.map((e) => e.reward);
  const max = rewards.length ? Math.max(...rewards) : 0;
  return (
    <MetricCard
      title={t("metrics.maxReward.title")}
      value={rewards.length ? max.toFixed(1) : DASH}
      delta={buildDelta(runSummaries, (s) => s.maxReward, { higherIsBetter: true, digits: 1 }, t("metrics.vsPrev"))}
      help={t("metrics.maxReward.help")}
    />
  );
};

export const StepsMinMetric = () => {
  const { t } = useTranslation();
  const { episodes, runSummaries } = useSimulation();
  const steps = episodes.map((e) => e.steps);
  const min = steps.length ? Math.min(...steps) : 0;
  return (
    <MetricCard
      title={t("metrics.minSteps.title")}
      value={steps.length ? min : DASH}
      delta={buildDelta(runSummaries, (s) => s.minSteps, { higherIsBetter: false, digits: 0 }, t("metrics.vsPrev"))}
      help={t("metrics.minSteps.help")}
    />
  );
};
