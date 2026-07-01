import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useSimulations } from "../hooks";
import {
  ChronoBody,
  ChronoClock,
  ChronoDot,
  ChronoHeader,
  ChronoSeg,
  ChronoSep,
  ChronoTitle,
  DefautWidgetBox,
  StatusPill,
} from "../styles";
import type { SimStatus } from "../types";
import { statusInfo } from "./TopBar";
import { WidgetHelp } from "./WidgetHelp";

const fmt2 = (n: number) => String(Math.floor(n)).padStart(2, "0");

const formatElapsed = (ms: number) => {
  const totalCentis = Math.floor(ms / 10);
  const centis = totalCentis % 100;
  const totalSecs = Math.floor(totalCentis / 100);
  const secs = totalSecs % 60;
  const mins = Math.floor(totalSecs / 60);
  return { mins: fmt2(mins), secs: fmt2(secs), centis: fmt2(centis) };
};

const aggregateStatus = (statuses: SimStatus[]): SimStatus => {
  if (statuses.includes("running")) return "running";
  if (statuses.includes("paused")) return "paused";
  if (statuses.includes("done")) return "done";
  if (statuses.includes("connected")) return "connected";
  return "disconnected";
};

export const Chrono = () => {
  const { t } = useTranslation();
  const { slots } = useSimulations();
  const status = aggregateStatus(slots.map((s) => s.sim.status));
  const episodesLen = slots.reduce((n, s) => n + s.sim.episodes.length, 0);
  const [elapsed, setElapsed] = useState(0);

  const startedAtRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const prevEpisodesLenRef = useRef(0);
  useEffect(() => {
    if (prevEpisodesLenRef.current > 0 && episodesLen === 0) {
      accumulatedRef.current = 0;
      setElapsed(0);
    }
    prevEpisodesLenRef.current = episodesLen;
  }, [episodesLen]);

  useEffect(() => {
    const tick = () => {
      if (startedAtRef.current != null) {
        const now = performance.now();
        setElapsed(accumulatedRef.current + (now - startedAtRef.current));
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    if (status === "running") {
      startedAtRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (startedAtRef.current != null) {
        accumulatedRef.current += performance.now() - startedAtRef.current;
        startedAtRef.current = null;
        setElapsed(accumulatedRef.current);
      }
    }

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [status]);

  const { mins, secs, centis } = formatElapsed(elapsed);
  const { text: statusText, color: statusColor } = statusInfo(status, t);

  return (
    <DefautWidgetBox>
      <ChronoHeader>
        <ChronoTitle>
          {t("chrono.title")}
          <WidgetHelp content={t("chrono.help")} />
        </ChronoTitle>
        <StatusPill>
          <span className="dot" style={{ background: statusColor }} />
          {statusText}
        </StatusPill>
      </ChronoHeader>

      <ChronoBody>
        <ChronoClock>
          <Seg value={mins} />
          <ChronoSep>:</ChronoSep>
          <Seg value={secs} />
          <ChronoDot>.</ChronoDot>
          <Seg value={centis} dim />
        </ChronoClock>
      </ChronoBody>
    </DefautWidgetBox>
  );
};

const Seg = ({ value, dim }: { value: string; dim?: boolean }) => (
  <ChronoSeg $dim={dim}>{value}</ChronoSeg>
);
