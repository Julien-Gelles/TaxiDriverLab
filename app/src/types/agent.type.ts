import type { AgentKey, SavedAgent } from "./simulation.type";

export type PretrainedEntry = { agent: string; double: boolean };

export type PretrainedApi = {
  available: PretrainedEntry[];
  refresh: () => void;
  has: (agent: string, double: boolean) => boolean;
};

export type AgentSaveInput = {
  name: string;
  agent: AgentKey;
  double: boolean;
  qTable: number[][];
};

export type SavedAgentsContextValue = {
  agents: SavedAgent[];
  maxSlots: number;
  hasFreeSlot: boolean;
  saveLocal: (input: AgentSaveInput) => boolean;
  saveFile: (input: AgentSaveInput) => void;
  exportFile: (id: string) => void;
  importFile: (file: File) => Promise<boolean>;
  remove: (id: string) => void;
};
