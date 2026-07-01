import { useEffect, useRef } from "react";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSimulation, useSimConfig } from "../hooks";
import {
  ActionRow,
  CanvasWrap,
  DefautWidgetBox,
  FrozenBadge,
  LegendBar,
  LegendMax,
  LegendMin,
  LegendRow,
  MutedText,
  QCanvas,
  QEmpty,
  QTitleRow,
  WidgetTitle,
} from "../styles";
import { qValueToBlueYellow, rgbCss } from "../utils/qColor";
import { WidgetHelp } from "./WidgetHelp";
import { VersionTag } from "./VersionTag";

const FALLBACK_ACTIONS = ["South", "North", "East", "West", "Pickup", "Dropoff"];

export const QTablePanel = () => {
  const { t } = useTranslation();
  const { qTable, caps, layout } = useSimulation();
  const { agent, mode } = useSimConfig();
  const isDemo = mode === "demo";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const isTabular = agent === "Q" || agent === "S" || agent === "M";
  const actionNames = layout?.actionNames ?? FALLBACK_ACTIONS;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !qTable) return;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { q, lastState } = qTable;
      const nStates = q.length;
      const nActions = q[0]?.length ?? 0;
      if (nStates === 0 || nActions === 0) return;

      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = w;
      canvas.height = h;

      let qMin = Infinity;
      let qMax = -Infinity;
      for (let s = 0; s < nStates; s++) {
        const row = q[s];
        for (let a = 0; a < nActions; a++) {
          const v = row[a];
          if (v < qMin) qMin = v;
          if (v > qMax) qMax = v;
        }
      }

      const cellW = w / nActions;
      for (let s = 0; s < nStates; s++) {
        const y0 = Math.floor((s * h) / nStates);
        const y1 = Math.max(y0 + 1, Math.floor(((s + 1) * h) / nStates));
        const row = q[s];
        for (let a = 0; a < nActions; a++) {
          ctx.fillStyle = rgbCss(qValueToBlueYellow(row[a], qMin, qMax, isDemo));
          ctx.fillRect(a * cellW, y0, cellW + 1, y1 - y0);
        }
      }

      if (lastState != null && lastState >= 0 && lastState < nStates) {
        const y0 = Math.floor((lastState * h) / nStates);
        const y1 = Math.max(y0 + 2, Math.floor(((lastState + 1) * h) / nStates));
        ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
        ctx.fillRect(0, y0, w, y1 - y0);
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [qTable, isDemo]);

  if (!isTabular || !caps?.hasQTable) {
    return (
      <DefautWidgetBox>
        <WidgetTitle>
          <span>
            <VersionTag />
            {t("qtable.title")}
            <WidgetHelp content={t("qtable.help")} />
          </span>
        </WidgetTitle>
        <QEmpty>
          {isTabular ? t("qtable.empty_waiting") : t("qtable.empty_noAgent")}
        </QEmpty>
      </DefautWidgetBox>
    );
  }

  return (
    <DefautWidgetBox>
      <WidgetTitle>
        <QTitleRow>
          <VersionTag />
          {t("qtable.title")}
          {isDemo && (
            <FrozenBadge>
              <Lock size={10} />
              {t("qtable.frozen")}
            </FrozenBadge>
          )}
          <WidgetHelp content={t("qtable.help")} />
        </QTitleRow>
        <MutedText>
          {qTable ? t("qtable.states", { n: qTable.q.length }) : t("qtable.waiting")}
        </MutedText>
      </WidgetTitle>
      <CanvasWrap ref={wrapRef}>
        <QCanvas ref={canvasRef} />
      </CanvasWrap>
      <ActionRow>
        {actionNames.map((name) => (
          <span key={name}>{name}</span>
        ))}
      </ActionRow>
      <LegendRow>
        <LegendMin>{t("qtable.min")}</LegendMin>
        <LegendBar />
        <LegendMax>{t("qtable.max")}</LegendMax>
      </LegendRow>
    </DefautWidgetBox>
  );
};
