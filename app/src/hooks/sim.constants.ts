import type { AgentKey } from "../types";

export const SPEED_PRESETS: { tKey: string; delay: number }[] = [
  { tKey: "speeds.slow", delay: 0.4 },
  { tKey: "speeds.normal", delay: 0.12 },
  { tKey: "speeds.fast", delay: 0.03 },
  { tKey: "speeds.veryFast", delay: 0.01 },
  { tKey: "speeds.max", delay: 0.0 },
];

export const AGENTS: { key: AgentKey; tKey: string; subKey: string }[] = [
  { key: "Q", tKey: "agents.Q.label", subKey: "agents.Q.sub" },
  { key: "S", tKey: "agents.S.label", subKey: "agents.S.sub" },
  { key: "M", tKey: "agents.M.label", subKey: "agents.M.sub" },
  { key: "D", tKey: "agents.D.label", subKey: "agents.D.sub" },
  { key: "B", tKey: "agents.B.label", subKey: "agents.B.sub" },
  { key: "R", tKey: "agents.R.label", subKey: "agents.R.sub" },
];
