import { MonitorPlay, Pause, Play, Square, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSimulations, useSavedAgents, AGENTS, SPEED_PRESETS } from "../hooks";
import type { SimConfigValue } from "../hooks";
import type { SavedAgent, StartParams } from "../types";
import {
  ControlButtons,
  ControlChip,
  ControlEpisode,
  ControlFooter,
  ControlIconBadge,
  ControlProgress,
  ControlProgressFill,
  ControlStack,
  ControlSubtitle,
  DefautWidgetBox,
  PrimaryButton,
  SecondaryButton,
  theme,
} from "../styles";
import { WidgetHelp } from "./WidgetHelp";

const TRAIN_CARD_BG = `linear-gradient(150deg, ${theme.yellowGlow}, ${theme.yellow} 55%, ${theme.yellowDark})`;
const DEMO_CARD_BG = `linear-gradient(150deg, #4ade80, #22c55e 55%, #16a34a)`;

// Build the start payload for a slot. In demo, when a user-saved agent is
// selected, its agent/passenger-mode and Q-table override the config so the
// backend replays that saved model instead of a built-in pretrained one.
const paramsFor = (c: SimConfigValue, saved?: SavedAgent | null): StartParams => ({
  agent: saved ? saved.agent : c.agent,
  episodes: c.episodes,
  delay: c.delay,
  alpha: c.alpha,
  gamma: c.gamma,
  epsilon: c.epsilon,
  seed: c.seed,
  double: saved ? saved.double : c.isDouble,
  maxSteps: c.maxSteps,
  mode: c.mode,
  ...(saved ? { model: { type: "qtable", data: saved.qTable } } : {}),
});

export const PlayControls = () => {
  const { t } = useTranslation();
  const { slots, activeCount } = useSimulations();
  const { agents: savedAgents } = useSavedAgents();

  const shared = slots[0]?.config;
  const isDemo = shared?.mode === "demo";
  const speedTKey = SPEED_PRESETS[shared?.speedIndex ?? 0]?.tKey;
  const speedLabel = speedTKey ? t(speedTKey) : "—";

  const running = slots.some((s) => s.sim.status === "running");
  const paused = !running && slots.some((s) => s.sim.status === "paused");
  const active = running || paused;
  const connected = slots.length > 0 && slots.every((s) => s.sim.connected);

  const total = shared?.episodes ?? 0;
  const current = slots.length
    ? Math.min(...slots.map((s) => s.sim.step?.episode ?? s.sim.episodes.length))
    : 0;
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  const agentTKey = AGENTS.find((a) => a.key === shared?.agent)?.tKey;
  const subtitle =
    activeCount <= 1
      ? (agentTKey ? t(agentTKey) : shared?.agent ?? "—")
      : slots.map((s) => `${s.letter}·${s.config.agent}`).join("  ");

  const handlePrimary = () => {
    if (running) slots.forEach((s) => s.sim.pause());
    else if (paused) slots.forEach((s) => s.sim.resume());
    else
      slots.forEach((s) => {
        const saved =
          s.config.mode === "demo" && s.config.savedAgentId
            ? savedAgents.find((a) => a.id === s.config.savedAgentId) ?? null
            : null;
        s.sim.start(paramsFor(s.config, saved));
      });
  };
  const handleStop = () => slots.forEach((s) => s.sim.stop());

  const PrimaryIcon = running ? Pause : Play;
  const primaryLabel = running
    ? t("play.pause")
    : paused
      ? t("play.resume")
      : isDemo
        ? t("play.launch_demo")
        : t("play.launch");
  const ChipIcon = isDemo ? MonitorPlay : Zap;

  return (
    <DefautWidgetBox $color={isDemo ? DEMO_CARD_BG : TRAIN_CARD_BG}>
      <ControlStack>
        <ControlChip>
          <ChipIcon size={14} fill={theme.onAccent} />
          {isDemo ? t("play.chip_demo") : t("play.chip_train")}
          <WidgetHelp content={isDemo ? t("play.help_demo") : t("play.help_train")} />
        </ControlChip>

        <ControlSubtitle>
          {isDemo ? t("play.subtitle_demo") : t("play.subtitle_train")} · {subtitle}
        </ControlSubtitle>

        <ControlEpisode>
          <span className="num">{current}</span>
          <span className="total">{t("play.episodes", { total })}</span>
        </ControlEpisode>

        <ControlProgress>
          <ControlProgressFill $pct={pct} />
        </ControlProgress>

        <ControlButtons>
          <PrimaryButton onClick={handlePrimary} disabled={!connected}>
            <ControlIconBadge>
              <PrimaryIcon size={16} fill={theme.onAccent} />
            </ControlIconBadge>
            {primaryLabel}
          </PrimaryButton>
          <SecondaryButton onClick={handleStop} disabled={!connected || !active} aria-label={t("play.stop")}>
            <ControlIconBadge>
              <Square size={16} fill={theme.onAccent} />
            </ControlIconBadge>
          </SecondaryButton>
        </ControlButtons>

        <ControlFooter>
          {t("play.speed", { label: speedLabel })}
          {activeCount <= 1 ? ` · seed ${shared?.seed ?? "—"}` : ` · ${activeCount} versions`}
        </ControlFooter>
      </ControlStack>
    </DefautWidgetBox>
  );
};
