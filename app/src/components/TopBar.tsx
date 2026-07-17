import { useTranslation } from "react-i18next";
import { GraduationCap, Layers, Play, RotateCw } from "lucide-react";
import type { TFunction } from "i18next";

import { useSimulations, useSimConfig, AGENTS } from "../hooks";
import {
  Breadcrumb,
  IconBtn,
  Left,
  ModeBtn,
  ModeToggle,
  Right,
  StatusPill,
  theme,
} from "../styles";
import type { SimStatus, StatusInfo } from "../types";

export { StatusPill };

export const statusInfo = (status: SimStatus, t: TFunction): StatusInfo => {
  switch (status) {
    case "running":
      return { text: t("status.running"), color: theme.yellow };
    case "paused":
    case "disconnected":
      return { text: t("status.stopped"), color: theme.danger };
    default:
      return { text: t("status.ready"), color: theme.success };
  }
};

export const TopBarContent = () => {
  const { t, i18n } = useTranslation();
  const { slots, activeCount } = useSimulations();
  const { mode, setMode } = useSimConfig();

  const statuses = slots.map((s) => s.sim.status);
  const status: SimStatus = statuses.includes("running")
    ? "running"
    : statuses.includes("paused")
      ? "paused"
      : statuses.includes("done")
        ? "done"
        : statuses.includes("connected")
          ? "connected"
          : "disconnected";

  const agent = slots[0]?.config.agent;
  const isDouble = slots[0]?.config.isDouble ?? false;
  const agentTKey = AGENTS.find((a) => a.key === agent)?.tKey;
  const agentLabel =
    activeCount > 1
      ? t("topbar.simulations", { count: activeCount })
      : agentTKey
        ? t(agentTKey)
        : (agent ?? "—");
  const passengerLabel =
    activeCount > 1
      ? slots.map((s) => s.letter).join(" · ")
      : isDouble
        ? t("topbar.passengers2")
        : t("topbar.passengers1");
  const { text: statusText, color: statusColor } = statusInfo(status, t);
  const locked = status === "running" || status === "paused";

  const lang = i18n.language.startsWith("en") ? "EN" : "FR";
  const toggleLang = () => i18n.changeLanguage(lang === "FR" ? "en" : "fr");

  return (
    <>
      <Left>
        <Layers size={20} color="var(--accent)" strokeWidth={2.2} />
        <Breadcrumb>
          <strong>Taxi-v4</strong>
          <span className="sep">/</span>
          <span className="agent">{agentLabel}</span>
          <span className="mid">·</span>
          <span className="agent">{passengerLabel}</span>
        </Breadcrumb>
      </Left>

      <Right>
        <ModeToggle $disabled={locked}>
          <ModeBtn
            $active={mode === "train"}
            $mode="train"
            disabled={locked}
            onClick={() => setMode("train")}
            title={t("mode.trainTitle")}
          >
            <GraduationCap size={13} />
            {t("mode.train")}
          </ModeBtn>
          <ModeBtn
            $active={mode === "demo"}
            $mode="demo"
            disabled={locked}
            onClick={() => setMode("demo")}
            title={t("mode.demoTitle")}
          >
            <Play size={13} />
            {t("mode.demo")}
          </ModeBtn>
        </ModeToggle>

        <StatusPill>
          <span className="dot" style={{ background: statusColor }} />
          {statusText}
        </StatusPill>
        <IconBtn
          aria-label={t("topbar.reload")}
          onClick={() => window.location.reload()}
        >
          <RotateCw size={18} />
        </IconBtn>
        <IconBtn $wide onClick={toggleLang} aria-label={t("topbar.lang")}>
          {lang}
        </IconBtn>
      </Right>
    </>
  );
};
