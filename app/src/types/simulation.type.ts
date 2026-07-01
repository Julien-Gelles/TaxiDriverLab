// Types mirroring the simulation API WebSocket protocol.

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
  passengerDelivered: number; // 5 — double mode only, ignored in single mode
  actionNames: string[];
};

// Single-passenger step: passenger + destination are present.
// Double-passenger step: p1Loc/p1Dest/p2Loc/p2Dest are present instead.
export type StepState = {
  taxi: Cell;
  // single mode
  passenger?: number;   // 0-3 = at a location, 4 = in the taxi
  destination?: number; // 0-3
  // double mode
  p1Loc?: number;       // 0-3 = at location, 4 = in taxi, 5 = delivered
  p1Dest?: number;
  p2Loc?: number;
  p2Dest?: number;
  // common
  reward: number;
  lastAction: number;
  lastActionName: string;
  actionCounts: number[]; // cumulative per-action tally for the whole run
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

// Live Q-table snapshot (state_size × action_size) + the row just updated.
export type QTablePayload = {
  q: number[][];
  lastState: number | null;
};

// DQN per-layer activations for the current state.
export type Activations = {
  embedding: number[];
  hidden: number[];
  output: number[];
};

// DQN linear-layer weight matrices (target × source).
export type Weights = {
  fc1: number[][];
  fc2: number[][];
};

// Which live visualisations the running agent can feed.
export type Caps = {
  hasQTable: boolean;
  isNeural: boolean;
};

// Aggregate snapshot of a finished run, frozen when the run ends (naturally or
// via force-stop). Kept across runs so KPI cards can show a run-to-run delta.
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

// A model the UI replays in demo mode (a Q-table it saved from a prior in-app
// training run). Mirrors the backend pretrained payload shape so the same
// apply_payload() path can inject it. Only tabular agents (Q/S/M) are saveable.
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
  // Demo only: replay this saved Q-table instead of the backend's pretrained one.
  model?: SavedModel;
};

// One user-saved agent: a tabular model captured from an in-app training run,
// plus the metadata needed to list it and replay it in demo.
//   persisted: true  → stored in localStorage (survives reloads)
//   persisted: false → session-only slot (e.g. saved to file, or imported);
//                      removed on reload, the file is the durable copy.
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
