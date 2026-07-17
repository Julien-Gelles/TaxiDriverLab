import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useSimulation, useSimConfig } from "../hooks";
import {
  DefautWidgetBox,
  GraphBox,
  GraphSvg,
  MutedText,
  NetworkEmpty,
  WidgetTitle,
  theme,
} from "../styles";
import type { LayerGroup, NetworkEdge } from "../types";
import { qValueToBlueYellow, rgbCss } from "../utils/qColor";
import { WidgetHelp } from "./WidgetHelp";
import { VersionTag } from "./VersionTag";

const MAX_NODES_PER_LAYER = 50;
const EDGES_PER_NODE = 3;
const VB_W = 320;
const VB_H = 200;

const layerGroups = (n: number, max: number): LayerGroup[] => {
  if (n <= 0) return [];
  if (n <= max) return Array.from({ length: n }, (_, i) => [i, i + 1]);
  const groups: LayerGroup[] = [];
  for (let k = 0; k < max; k++) {
    const s = Math.floor((k * n) / max);
    let e = Math.floor(((k + 1) * n) / max);
    if (e <= s) e = s + 1;
    groups.push([s, e]);
  }
  return groups;
};

const mean = (arr: number[], s: number, e: number): number => {
  let sum = 0;
  for (let i = s; i < e; i++) sum += arr[i];
  return sum / (e - s);
};

const groupVector = (v: number[], groups: LayerGroup[]): number[] =>
  groups.map(([s, e]) => (v.length ? mean(v, s, e) : 0));

const groupMatrix = (
  W: number[][],
  rowGroups: LayerGroup[],
  colGroups: LayerGroup[]
): number[][] =>
  rowGroups.map(([rs, re]) =>
    colGroups.map(([cs, ce]) => {
      let sum = 0;
      let count = 0;
      for (let r = rs; r < re; r++) {
        for (let c = cs; c < ce; c++) {
          sum += W[r][c];
          count++;
        }
      }
      return count ? sum / count : 0;
    })
  );

const colXs = [30, VB_W / 2, VB_W - 30];
const TOP = 24;
const BOTTOM = VB_H - 22;

export const NetworkPanel = () => {
  const { t } = useTranslation();
  const { activations, weights } = useSimulation();
  const { agent, mode } = useSimConfig();
  const isDqn = agent === "D";
  const isDemo = mode === "demo";

  const graph = useMemo(() => {
    if (!activations || !weights) return null;

    const layers = [
      { name: t("network.layers.emb"), v: activations.embedding },
      { name: t("network.layers.hidden"), v: activations.hidden },
      { name: t("network.layers.output"), v: activations.output },
    ];
    const wBetween = [weights.fc1, weights.fc2];

    const groups = layers.map((l) => layerGroups(l.v.length, MAX_NODES_PER_LAYER));
    const groupedActs = layers.map((l, i) => groupVector(l.v, groups[i]));
    const usableH = BOTTOM - TOP;
    const nodeYs = groups.map((g) => {
      const ng = g.length;
      if (ng <= 1) return [TOP + usableH / 2];
      return Array.from({ length: ng }, (_, k) => TOP + (k * usableH) / (ng - 1));
    });

    const groupedW = [
      groupMatrix(wBetween[0], groups[1], groups[0]),
      groupMatrix(wBetween[1], groups[2], groups[1]),
    ];

    const edges: NetworkEdge[] = [];
    for (let li = 0; li < 2; li++) {
      const wg = groupedW[li];
      if (!wg.length) continue;
      let maxabs = 0;
      for (const row of wg) for (const x of row) maxabs = Math.max(maxabs, Math.abs(x));
      maxabs = maxabs || 1;
      const srcX = colXs[li];
      const tgtX = colXs[li + 1];
      const srcYs = nodeYs[li];
      const tgtYs = nodeYs[li + 1];
      for (let j = 0; j < wg.length; j++) {
        const row = wg[j];
        const idx = row
          .map((w, i) => [i, Math.abs(w)] as [number, number])
          .sort((a, b) => b[1] - a[1])
          .slice(0, EDGES_PER_NODE)
          .map(([i]) => i);
        for (const i of idx) {
          const w = row[i];
          const strength = Math.min(1, Math.abs(w) / maxabs);
          const base = w >= 0 ? (isDemo ? [34, 197, 94] : [232, 180, 0]) : [59, 130, 246];
          const a = 0.15 + 0.7 * strength;
          edges.push({
            x1: srcX, y1: srcYs[i], x2: tgtX, y2: tgtYs[j],
            color: `rgba(${base[0]}, ${base[1]}, ${base[2]}, ${a})`,
          });
        }
      }
    }

    const nodes = layers.map((l, li) => {
      const ga = groupedActs[li];
      const vmin = ga.length ? Math.min(...ga) : 0;
      const vmax = ga.length ? Math.max(...ga) : 0;
      return {
        name: l.name,
        size: l.v.length,
        x: colXs[li],
        items: nodeYs[li].map((y, k) => ({
          y,
          color: rgbCss(qValueToBlueYellow(ga[k], vmin, vmax, isDemo)),
        })),
      };
    });

    return { edges, nodes };
  }, [activations, weights, isDemo, t]);

  if (!isDqn) {
    return (
      <DefautWidgetBox>
        <WidgetTitle>
          <span>
            <VersionTag />
            {t("network.title")}
            <WidgetHelp content={t("network.help")} />
          </span>
        </WidgetTitle>
        <NetworkEmpty>{t("network.dqnOnly")}</NetworkEmpty>
      </DefautWidgetBox>
    );
  }

  return (
    <DefautWidgetBox>
      <WidgetTitle>
        <span>
          <VersionTag />
          {t("network.title")}
          <WidgetHelp content={t("network.help")} />
        </span>
        <MutedText>{t("network.subtitle")}</MutedText>
      </WidgetTitle>
      {graph ? (
        <GraphBox>
          <GraphSvg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {graph.edges.map((e, i) => (
              <line key={`e-${i}`} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={e.color} strokeWidth={0.6} />
            ))}
            {graph.nodes.map((layer) =>
              layer.items.map((n, k) => (
                <circle key={`${layer.name}-${k}`} cx={layer.x} cy={n.y} r={3} fill={n.color} stroke={theme.ink} strokeWidth={0.4} />
              ))
            )}
            {graph.nodes.map((layer) => (
              <text key={`lbl-${layer.name}`} x={layer.x} y={VB_H - 6} fontSize={9} fontWeight={700} fill={theme.ink} textAnchor="middle">
                {`${layer.name} (${layer.size})`}
              </text>
            ))}
          </GraphSvg>
        </GraphBox>
      ) : (
        <NetworkEmpty>{t("network.waiting")}</NetworkEmpty>
      )}
    </DefautWidgetBox>
  );
};
