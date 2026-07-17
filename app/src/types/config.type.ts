import type { AgentKey, SimMode } from "./simulation.type";

export type SpeedPreset = { tKey: string; delay: number };

export type AgentOption = { key: AgentKey; tKey: string; subKey: string };

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

export type SharedConfig = {
  episodesOverride: number | null;
  mode: SimMode;
  speedIndex: number;
  setEpisodes: (n: number) => void;
  setMode: (m: SimMode) => void;
  setSpeedIndex: (i: number) => void;
};
