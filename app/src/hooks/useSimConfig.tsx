import { useState } from "react";
import type {
  AgentKey,
  PerVersionConfig,
  SharedConfig,
  SimConfigValue,
  SimMode,
} from "../types";
import { SPEED_PRESETS } from "./sim.constants";

const DEFAULT_EPISODES = { demo: 30, train: 2000 };
const DEFAULT_MAX_STEPS = { demo: 100, single: 200, double: 400 };

export const defaultEpisodes = (mode: SimMode): number =>
  mode === "demo" ? DEFAULT_EPISODES.demo : DEFAULT_EPISODES.train;

export const defaultMaxSteps = (mode: SimMode, isDouble: boolean): number =>
  mode === "demo"
    ? DEFAULT_MAX_STEPS.demo
    : isDouble
      ? DEFAULT_MAX_STEPS.double
      : DEFAULT_MAX_STEPS.single;

export const usePerVersionConfig = (): PerVersionConfig => {
  const [agent, setAgent] = useState<AgentKey>("Q");
  const [isDouble, setIsDouble] = useState(false);
  const [alpha, setAlpha] = useState(0.1);
  const [gamma, setGamma] = useState(0.99);
  const [epsilon, setEpsilon] = useState(1.0);
  const [seed, setSeed] = useState(42);
  const [maxStepsOverride, setMaxStepsOverride] = useState<number | null>(null);
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

export const useSharedConfig = (): SharedConfig => {
  const [episodesOverride, setEpisodes] = useState<number | null>(null);
  const [mode, setMode] = useState<SimMode>("train");
  const [speedIndex, setSpeedIndex] = useState(1);
  return {
    episodesOverride,
    mode,
    speedIndex,
    setEpisodes,
    setMode,
    setSpeedIndex,
  };
};

export const mergeConfig = (
  pv: PerVersionConfig,
  shared: SharedConfig,
): SimConfigValue => {
  const episodes = shared.episodesOverride ?? defaultEpisodes(shared.mode);
  const maxSteps =
    pv.maxStepsOverride ?? defaultMaxSteps(shared.mode, pv.isDouble);
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
