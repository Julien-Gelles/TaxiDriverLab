import type { SimConfigValue } from "./config.type";

export type Cell = { row: number; col: number };

export type SimLocation = {
  id: number;
  label: string;
  row: number;
  col: number;
};

export type Layout = {
  rows: number;
  cols: number;
  locations: SimLocation[];
  walls: [number[], number[]][];
  passengerInTaxi: number;
  passengerDelivered: number;
  actionNames: string[];
};

export type StepState = {
  taxi: Cell;
  passenger?: number; // 0-3 = at a location, 4 = in the taxi
  destination?: number; // 0-3
  p1Loc?: number; // 0-3 = at location, 4 = in taxi, 5 = delivered
  p1Dest?: number;
  p2Loc?: number;
  p2Dest?: number;
  reward: number;
  lastAction: number;
  lastActionName: string;
  actionCounts: number[];
  epsilon: number | null;
  mode: "explore" | "exploit";
  step: number;
  episode: number;
  episodes: number;
  done: boolean;
  double: boolean;
};

export type EpisodePoint = {
  episode: number;
  reward: number;
  steps: number;
  epsilon: number | null;
  success: boolean;
};

export type QTablePayload = {
  q: number[][];
  lastState: number | null;
};

export type Activations = {
  embedding: number[];
  hidden: number[];
  output: number[];
};

export type Weights = {
  fc1: number[][];
  fc2: number[][];
};

export type Caps = {
  hasQTable: boolean;
  isNeural: boolean;
};

export type RunSummary = {
  episodeCount: number;
  avgReward: number;
  lastEpsilon: number | null;
  avgSteps: number;
  totalSteps: number;
  maxReward: number;
  minSteps: number;
};

export type SimStatus =
  | "disconnected"
  | "connected"
  | "running"
  | "paused"
  | "done";

export type AgentKey = "Q" | "B" | "R" | "S" | "M" | "D";

export type SimMode = "train" | "demo";

export type SavedModel = { type: "qtable"; data: number[][] };

export type StartParams = {
  agent?: AgentKey;
  episodes?: number;
  delay?: number;
  alpha?: number;
  gamma?: number;
  epsilon?: number;
  seed?: number;
  double?: boolean;
  maxSteps?: number;
  mode?: SimMode;
  model?: SavedModel;
};

export type SavedAgent = {
  id: string;
  name: string;
  agent: AgentKey;
  double: boolean;
  qTable: number[][];
  persisted: boolean;
  createdAt: number;
};

export type SimContextValue = {
  status: SimStatus;
  connected: boolean;
  isDouble: boolean;
  layout: Layout | null;
  step: StepState | null;
  episodes: EpisodePoint[];
  caps: Caps | null;
  runSummaries: RunSummary[];
  qTable: QTablePayload | null;
  activations: Activations | null;
  weights: Weights | null;
  start: (params?: StartParams) => void;
  pause: () => void;
  resume: () => void;
  setSpeed: (delay: number) => void;
  stop: () => void;
};

export type SimulationsContextValue = {
  sims: SimContextValue[];
  configs: SimConfigValue[];
  activeCount: number;
};

export type SimulationSlot = {
  index: number;
  letter: string;
  sim: SimContextValue;
  config: SimConfigValue;
};

export type SimulationSlots = {
  slots: SimulationSlot[];
  activeCount: number;
};

export type WidgetVersion = {
  index: number;
  letter: string;
  label: string;
};
