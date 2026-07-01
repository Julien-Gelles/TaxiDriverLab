import { useId, useMemo, useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";

import { useSimulations, versionColor } from "../hooks";
import {
  ChartArea,
  ChartEmpty,
  ChartLegend,
  ChartSvg,
  ChartTooltip,
  DefautWidgetBox,
  LegendItem,
  MutedText,
  Swatch,
  TooltipEp,
  TooltipLetter,
  TooltipRow,
  WidgetTitle,
  theme,
} from "../styles";
import { movingAverage, smoothWindow } from "../utils/smooth";
import { WidgetHelp } from "./WidgetHelp";

type Metric = "reward" | "steps" | "epsilon";

const VB_W = 300;
const VB_H = 160;
const PAD_L = 34;
const PAD_R = 8;
const PAD_T = 10;
const PAD_B = 18;

export const EpisodeChart = ({ metric }: { metric: Metric }) => {
  const { t } = useTranslation();
  const { slots, activeCount } = useSimulations();
  const gradId = useId();

  const title = t(`charts.${metric}.title`);
  const help = t(`charts.${metric}.help`);

  const model = useMemo(() => {
    const raw = slots
      .map((s) => ({
        index: s.index,
        letter: s.letter,
        color: versionColor(s.index),
        points: s.sim.episodes
          .map((e) => ({ x: e.episode, y: e[metric] }))
          .filter((p): p is { x: number; y: number } => p.y != null),
      }))
      .filter((s) => s.points.length > 0);

    if (raw.length === 0) return null;

    const allXs = raw.flatMap((s) => s.points.map((p) => p.x));
    const allYs = raw.flatMap((s) => s.points.map((p) => p.y));
    const xMin = Math.min(...allXs);
    const xMax = Math.max(...allXs);
    let yMin = Math.min(...allYs);
    let yMax = Math.max(...allYs);
    if (yMin === yMax) { yMin -= 1; yMax += 1; }

    const innerW = VB_W - PAD_L - PAD_R;
    const innerH = VB_H - PAD_T - PAD_B;
    const sx = (x: number) =>
      PAD_L + (xMax === xMin ? innerW / 2 : ((x - xMin) / (xMax - xMin)) * innerW);
    const sy = (y: number) => PAD_T + innerH - ((y - yMin) / (yMax - yMin)) * innerH;
    const baseY = PAD_T + innerH;

    const series = raw.map((s) => {
      const ys = s.points.map((p) => p.y);
      const smoothYs = movingAverage(ys, smoothWindow(ys.length));
      const toPath = (getY: (i: number) => number) =>
        s.points.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(getY(i)).toFixed(1)}`).join(" ");
      const rawPath = toPath((i) => ys[i]);
      const smoothPath = toPath((i) => smoothYs[i]);
      const last = s.points[s.points.length - 1];
      const lastSmooth = smoothYs[smoothYs.length - 1];
      const area = `${smoothPath} L${sx(last.x).toFixed(1)},${baseY} L${sx(s.points[0].x).toFixed(1)},${baseY} Z`;
      const plotted = s.points.map((p, i) => ({ ep: p.x, val: smoothYs[i], sx: sx(p.x), sy: sy(smoothYs[i]) }));
      return { ...s, rawPath, smoothPath, area, lastX: sx(last.x), lastY: sy(lastSmooth), plotted };
    });

    return { series, yMin, yMax, baseY, single: series.length === 1 };
  }, [slots, metric]);

  type HoverPoint = { letter: string; color: string; sy: number; val: number };
  const [hover, setHover] = useState<{ sx: number; ep: number; points: HoverPoint[] } | null>(null);
  const anchorSeries = model?.series[0] ?? null;

  const handleMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!model || !anchorSeries || anchorSeries.plotted.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const vbX = ((e.clientX - rect.left) / rect.width) * VB_W;

    let anchor = anchorSeries.plotted[0];
    let bestDist = Infinity;
    for (const pt of anchorSeries.plotted) {
      const d = Math.abs(pt.sx - vbX);
      if (d < bestDist) { bestDist = d; anchor = pt; }
    }

    const points: HoverPoint[] = model.series.map((s) => {
      let near = s.plotted[0];
      let dist = Infinity;
      for (const pt of s.plotted) {
        const d = Math.abs(pt.ep - anchor.ep);
        if (d < dist) { dist = d; near = pt; }
      }
      return { letter: s.letter, color: s.color, sy: near.sy, val: near.val };
    });

    setHover({ sx: anchor.sx, ep: anchor.ep, points });
  };

  const epCount = Math.max(0, ...slots.map((s) => s.sim.episodes.length));

  return (
    <DefautWidgetBox>
      <WidgetTitle>
        <span>
          {title}
          <WidgetHelp content={help} />
        </span>
        <MutedText>{t("charts.epLabel", { n: epCount })}</MutedText>
      </WidgetTitle>
      {model ? (
        <ChartArea>
          <ChartSvg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="none"
            onMouseMove={handleMove}
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              {model.single && (
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={model.series[0].color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={model.series[0].color} stopOpacity={0} />
                </linearGradient>
              )}
            </defs>
            <line x1={PAD_L} y1={model.baseY} x2={VB_W - PAD_R} y2={model.baseY} stroke={theme.line} strokeWidth={1} />
            <text x={PAD_L - 4} y={PAD_T + 6} fontSize={9} fill={theme.grey} textAnchor="end">{fmt(model.yMax)}</text>
            <text x={PAD_L - 4} y={model.baseY} fontSize={9} fill={theme.grey} textAnchor="end">{fmt(model.yMin)}</text>
            {model.single && <path d={model.series[0].area} fill={`url(#${gradId})`} stroke="none" />}
            {model.series.map((s) => (
              <g key={s.index}>
                <path d={s.rawPath} fill="none" stroke={s.color} strokeWidth={1} strokeOpacity={0.28} strokeLinejoin="round" strokeLinecap="round" />
                <path d={s.smoothPath} fill="none" stroke={s.color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={s.lastX} cy={s.lastY} r={3} fill={s.color} />
              </g>
            ))}
            {hover && (
              <>
                <g stroke={theme.inkSoft} strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.7} pointerEvents="none">
                  <line x1={hover.sx} y1={PAD_T} x2={hover.sx} y2={model.baseY} vectorEffect="non-scaling-stroke" />
                  {model.single && (
                    <line x1={PAD_L} y1={hover.points[0].sy} x2={VB_W - PAD_R} y2={hover.points[0].sy} vectorEffect="non-scaling-stroke" />
                  )}
                </g>
                {hover.points.map((p) => (
                  <circle key={p.letter} cx={hover.sx} cy={p.sy} r={3.5} fill={p.color} stroke={theme.ink} strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />
                ))}
              </>
            )}
          </ChartSvg>

          {activeCount > 1 && (
            <ChartLegend>
              {model.series.map((s) => (
                <LegendItem key={s.index} $color={s.color}>
                  <Swatch $color={s.color} $size={8} />
                  {s.letter}
                </LegendItem>
              ))}
            </ChartLegend>
          )}

          {hover && (
            <ChartTooltip
              $left={(hover.sx / VB_W) * 100}
              $top={(Math.min(...hover.points.map((p) => p.sy)) / VB_H) * 100}
            >
              <TooltipEp>{t("charts.epLabel", { n: hover.ep })}</TooltipEp>
              {hover.points.map((p) =>
                model.single ? (
                  <span key={p.letter}>{fmt(p.val)}</span>
                ) : (
                  <TooltipRow key={p.letter}>
                    <Swatch $color={p.color} $size={7} />
                    <TooltipLetter $color={p.color}>{p.letter}</TooltipLetter>
                    <span>{fmt(p.val)}</span>
                  </TooltipRow>
                )
              )}
            </ChartTooltip>
          )}
        </ChartArea>
      ) : (
        <ChartEmpty>{t("charts.waiting")}</ChartEmpty>
      )}
    </DefautWidgetBox>
  );
};

function fmt(v: number): string {
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2);
}
