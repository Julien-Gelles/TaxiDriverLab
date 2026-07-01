import { useState } from "react";
import type { AgentKey, SimMode } from "../types";
import { SPEED_PRESETS } from "./sim.constants";

// Context-dependent defaults for the run-shape params. Both episodes and the
// per-episode step cap depend on the mode and (for training) the passenger count:
//   demo (any)        → 30 episodes / 100 steps  (short showcase of a frozen model)
//   training single   → 2000 episodes / 200 steps (Taxi-v4 TimeLimit)
//   training double   → 2000 episodes / 400 steps (simulator horizon)
const DEFAULT_EPISODES = { demo: 30, train: 2000 };
const DEFAULT_MAX_STEPS = { demo: 100, single: 200, double: 400 };

export const defaultEpisodes = (mode: SimMode): number =>
  mode === "demo" ? DEFAULT_EPISODES.demo : DEFAULT_EPISODES.train;

// Exported so per-instance HyperParams widgets can derive the same mode/passenger
// aware default for their local "Pas max" field.
export const defaultMaxSteps = (mode: SimMode, isDouble: boolean): number =>
  mode === "demo"
    ? DEFAULT_MAX_STEPS.demo
    : isDouble
      ? DEFAULT_MAX_STEPS.double
      : DEFAULT_MAX_STEPS.single;

// Full config a component sees: per-version fields + shared fields, merged.
export type SimConfigValue = {
  agent: AgentKey;
  isDouble: boolean;
  speedIndex: number;
  delay: number;
  episodes: number;
  alpha: number;
  gamma: number;
  epsilon: number;
  seed: number;
  maxSteps: number;
  mode: SimMode;
  // Demo only: id of the user-saved agent selected for this version, or null.
  // Mutually exclusive with the AgentChoice selection (see SavedAgents widget).
  savedAgentId: string | null;
  setAgent: (a: AgentKey) => void;
  setIsDouble: (d: boolean) => void;
  setSpeedIndex: (i: number) => void;
  setEpisodes: (n: number) => void;
  setAlpha: (n: number) => void;
  setGamma: (n: number) => void;
  setEpsilon: (n: number) => void;
  setSeed: (n: number) => void;
  setMaxSteps: (n: number) => void;
  setMode: (m: SimMode) => void;
  setSavedAgentId: (id: string | null) => void;
};

// ── Per-version config (one independent set per simulation slot A/B/C) ──────────
export type PerVersionConfig = {
  agent: AgentKey;
  isDouble: boolean;
  alpha: number;
  gamma: number;
  epsilon: number;
  seed: number;
  maxStepsOverride: number | null;
  savedAgentId: string | null;
  setAgent: (a: AgentKey) => void;
  setIsDouble: (d: boolean) => void;
  setAlpha: (n: number) => void;
  setGamma: (n: number) => void;
  setEpsilon: (n: number) => void;
  setSeed: (n: number) => void;
  setMaxStepsOverride: (n: number) => void;
  setSavedAgentId: (id: string | null) => void;
};

export const usePerVersionConfig = (): PerVersionConfig => {
  const [agent, setAgent] = useState<AgentKey>("Q");
  const [isDouble, setIsDouble] = useState(false);
  const [alpha, setAlpha] = useState(0.1);
  const [gamma, setGamma] = useState(0.99);
  const [epsilon, setEpsilon] = useState(1.0);
  const [seed, setSeed] = useState(42);
  // null → follow the mode/passenger default; a number → user override.
  const [maxStepsOverride, setMaxStepsOverride] = useState<number | null>(null);
  // Selected user-saved agent for this version (demo only), or null.
  const [savedAgentId, setSavedAgentId] = useState<string | null>(null);
  return {
    agent,
    isDouble,
    alpha,
    gamma,
    epsilon,
    seed,
    maxStepsOverride,
    savedAgentId,
    setAgent,
    setIsDouble,
    setAlpha,
    setGamma,
    setEpsilon,
    setSeed,
    setMaxStepsOverride,
    setSavedAgentId,
  };
};

// ── Shared config (one set for every simulation: episodes, mode, speed) ─────────
export type SharedConfig = {
  episodesOverride: number | null;
  mode: SimMode;
  speedIndex: number;
  setEpisodes: (n: number) => void;
  setMode: (m: SimMode) => void;
  setSpeedIndex: (i: number) => void;
};

export const useSharedConfig = (): SharedConfig => {
  const [episodesOverride, setEpisodes] = useState<number | null>(null);
  const [mode, setMode] = useState<SimMode>("train");
  const [speedIndex, setSpeedIndex] = useState(1);
  return { episodesOverride, mode, speedIndex, setEpisodes, setMode, setSpeedIndex };
};

// Merge a slot's per-version config with the shared config into the flat
// SimConfigValue every component consumes via useSimConfig().
export const mergeConfig = (pv: PerVersionConfig, shared: SharedConfig): SimConfigValue => {
  const episodes = shared.episodesOverride ?? defaultEpisodes(shared.mode);
  const maxSteps = pv.maxStepsOverride ?? defaultMaxSteps(shared.mode, pv.isDouble);
  return {
    agent: pv.agent,
    isDouble: pv.isDouble,
    speedIndex: shared.speedIndex,
    delay: SPEED_PRESETS[shared.speedIndex].delay,
    episodes,
    alpha: pv.alpha,
    gamma: pv.gamma,
    epsilon: pv.epsilon,
    seed: pv.seed,
    maxSteps,
    mode: shared.mode,
    savedAgentId: pv.savedAgentId,
    setAgent: pv.setAgent,
    setIsDouble: pv.setIsDouble,
    setSpeedIndex: shared.setSpeedIndex,
    setEpisodes: shared.setEpisodes,
    setAlpha: pv.setAlpha,
    setGamma: pv.setGamma,
    setEpsilon: pv.setEpsilon,
    setSeed: pv.setSeed,
    setMaxSteps: pv.setMaxStepsOverride,
    setMode: shared.setMode,
    setSavedAgentId: pv.setSavedAgentId,
  };
};
