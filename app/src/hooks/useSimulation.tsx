import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Layout,
  StepState,
  EpisodePoint,
  SimStatus,
  StartParams,
  SimContextValue,
  Caps,
  QTablePayload,
  Activations,
  Weights,
  RunSummary,
  SimMode,
} from "../types";
import {
  usePerVersionConfig,
  useSharedConfig,
  mergeConfig,
  type SimConfigValue,
} from "./useSimConfig";

// Up to three independent simulations run concurrently: slot 0 = version A,
// 1 = B, 2 = C. Each slot owns its own WebSocket + state + per-version config.
const MAX_SLOTS = 3;
export const VERSION_LETTERS = ["A", "B", "C"] as const;
// Per-version accent colours, shared by the title tags and the chart legends.
// A = gold (the app accent), B = blue, C = red.
export const VERSION_COLORS = ["#E8B400", "#4A78D6", "#ef4444"] as const;

// Resolved colour for a version. Version A reuses the global accent CSS variable
// so it follows the mode (gold in training, green in demo); B and C are fixed.
// eslint-disable-next-line react-refresh/only-export-components
export const versionColor = (index: number): string =>
  index === 0 ? "var(--accent)" : VERSION_COLORS[index] ?? "var(--accent)";

const mean = (xs: number[]) =>
  xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;

// Freeze the aggregate metrics of a just-finished run so cards can diff it
// against the previous run.
const summarize = (eps: EpisodePoint[]): RunSummary => {
  const rewards = eps.map((e) => e.reward);
  const steps = eps.map((e) => e.steps);
  const epsilons = eps
    .map((e) => e.epsilon)
    .filter((v): v is number => v != null);
  return {
    episodeCount: eps.length,
    avgReward: mean(rewards),
    lastEpsilon: epsilons.at(-1) ?? null,
    avgSteps: mean(steps),
    totalSteps: steps.reduce((s, x) => s + x, 0),
    maxReward: rewards.length ? Math.max(...rewards) : 0,
    minSteps: steps.length ? Math.min(...steps) : 0,
  };
};

const WS_URL =
  (import.meta.env.VITE_SIM_WS_URL as string | undefined) ??
  "ws://127.0.0.1:8000/ws";

// ── One simulation slot ───────────────────────────────────────────────────────
// The former SimulationProvider body, gated by `active`: an inactive slot (no
// component references its version) keeps no WebSocket open.
const useSimulationEngine = (active: boolean): SimContextValue => {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<SimStatus>("disconnected");
  const [isDouble, setIsDouble] = useState(false);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [step, setStep] = useState<StepState | null>(null);
  const [episodes, setEpisodes] = useState<EpisodePoint[]>([]);
  // Mirror of `episodes` so the message handler can snapshot the final values
  // without re-subscribing the WebSocket effect.
  const episodesRef = useRef<EpisodePoint[]>([]);
  const [runSummaries, setRunSummaries] = useState<RunSummary[]>([]);
  // When the user stops/pauses, frames already in flight on the socket keep
  // arriving for a moment. Gate them so the terrain freezes immediately instead
  // of replaying those stale steps. Reopened by the next run's "started".
  const applyStepsRef = useRef(true);
  const [caps, setCaps] = useState<Caps | null>(null);
  const [qTable, setQTable] = useState<QTablePayload | null>(null);
  const [activations, setActivations] = useState<Activations | null>(null);
  const [weights, setWeights] = useState<Weights | null>(null);

  // WebSocket connection with auto-reconnect — only while the slot is active.
  useEffect(() => {
    if (!active) return;
    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (closed) return;
        setConnected(true);
        setStatus((s) => (s === "disconnected" ? "connected" : s));
      };
      ws.onclose = () => {
        if (closed) return;
        setConnected(false);
        setStatus("disconnected");
        reconnectTimer = setTimeout(connect, 1500);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case "layout":
            setLayout(msg as Layout);
            break;
          case "started":
            setIsDouble(Boolean(msg.double));
            setCaps({
              hasQTable: Boolean(msg.hasQTable),
              isNeural: Boolean(msg.isNeural),
            });
            episodesRef.current = [];
            setEpisodes([]);
            setStep(null);
            setQTable(null);
            setActivations(null);
            setWeights(null);
            applyStepsRef.current = true;
            setStatus("running");
            break;
          case "step":
            if (!applyStepsRef.current) break;
            setStep(msg as StepState);
            break;
          case "qtable":
            setQTable({ q: msg.q, lastState: msg.lastState ?? null });
            break;
          case "activations":
            setActivations({
              embedding: msg.embedding,
              hidden: msg.hidden,
              output: msg.output,
            });
            break;
          case "weights":
            setWeights({ fc1: msg.fc1, fc2: msg.fc2 });
            break;
          case "episode": {
            const point: EpisodePoint = {
              episode: msg.episode,
              reward: msg.reward,
              steps: msg.steps,
              epsilon: msg.epsilon,
              success: msg.success,
            };
            episodesRef.current = [...episodesRef.current, point];
            setEpisodes(episodesRef.current);
            break;
          }
          case "done":
            setStatus("done");
            // Freeze this run's metrics (whether it finished or was stopped)
            // so the next run can be compared against it.
            if (episodesRef.current.length > 0) {
              setRunSummaries((prev) => [...prev, summarize(episodesRef.current)]);
            }
            break;
        }
      };
    };

    connect();
    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
      setConnected(false);
      setStatus("disconnected");
    };
  }, [active]);

  const send = useCallback((payload: object) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  const start = useCallback(
    (params?: StartParams) => {
      send({ type: "start", params: params ?? {} });
      setStatus("running");
    },
    [send]
  );
  const pause = useCallback(() => {
    // Freeze the terrain at once; in-flight step frames are ignored until resume.
    applyStepsRef.current = false;
    send({ type: "pause" });
    setStatus("paused");
  }, [send]);
  const resume = useCallback(() => {
    applyStepsRef.current = true;
    send({ type: "resume" });
    setStatus("running");
  }, [send]);
  const setSpeed = useCallback((delay: number) => send({ type: "speed", delay }), [send]);
  const stop = useCallback(() => {
    // Stop applying step frames immediately so the run visibly halts now, even
    // though a few frames are still draining from the socket.
    applyStepsRef.current = false;
    send({ type: "stop" });
  }, [send]);

  return {
    status,
    connected,
    isDouble,
    layout,
    step,
    episodes,
    caps,
    runSummaries,
    qTable,
    activations,
    weights,
    start,
    pause,
    resume,
    setSpeed,
    stop,
  };
};

// ── Multi-simulation provider ─────────────────────────────────────────────────

type SimulationsContextValue = {
  sims: SimContextValue[]; // length MAX_SLOTS
  configs: SimConfigValue[]; // length MAX_SLOTS
  activeCount: number;
};

// Volatile context: updates on every step frame. Only widgets consume it.
const SimulationsContext = createContext<SimulationsContextValue | null>(null);
// Stable context: just the activeCount setter, so the Grid (which sets it) never
// re-renders on simulation updates.
const SetActiveCountContext = createContext<(n: number) => void>(() => {});
// Which slot (0/1/2) the consuming widget belongs to. Provided per widget.
export const VersionContext = createContext<number>(0);

export const SimulationsProvider = ({ children }: { children: ReactNode }) => {
  const [activeCount, setActiveCountRaw] = useState(1);
  const setActiveCount = useCallback(
    (n: number) => setActiveCountRaw(Math.max(1, Math.min(MAX_SLOTS, n))),
    []
  );

  // Shared config (episodes count, mode, speed) — common to every slot.
  const shared = useSharedConfig();

  // Fixed number of slots so hook order is stable. Inactive slots stay idle.
  const pv0 = usePerVersionConfig();
  const pv1 = usePerVersionConfig();
  const pv2 = usePerVersionConfig();
  const sim0 = useSimulationEngine(0 < activeCount);
  const sim1 = useSimulationEngine(1 < activeCount);
  const sim2 = useSimulationEngine(2 < activeCount);

  const sims = useMemo(() => [sim0, sim1, sim2], [sim0, sim1, sim2]);

  // Mode switch is coordinated: leaving demo for training drops any selected
  // saved agent and falls back to base Q-learning for that version (a saved
  // agent only exists in demo). Other versions keep their normal agent.
  const setMode = useCallback(
    (m: SimMode) => {
      if (m === "train") {
        [pv0, pv1, pv2].forEach((pv) => {
          if (pv.savedAgentId) {
            pv.setSavedAgentId(null);
            pv.setAgent("Q");
          }
        });
      }
      shared.setMode(m);
    },
    [pv0, pv1, pv2, shared]
  );

  const configs = useMemo(
    () =>
      [pv0, pv1, pv2].map((pv) => ({ ...mergeConfig(pv, shared), setMode })),
    [pv0, pv1, pv2, shared, setMode]
  );

  const value = useMemo<SimulationsContextValue>(
    () => ({ sims, configs, activeCount }),
    [sims, configs, activeCount]
  );

  return (
    <SetActiveCountContext.Provider value={setActiveCount}>
      <SimulationsContext.Provider value={value}>
        {children}
      </SimulationsContext.Provider>
    </SetActiveCountContext.Provider>
  );
};

const useSimulationsContext = (): SimulationsContextValue => {
  const ctx = useContext(SimulationsContext);
  if (!ctx) {
    throw new Error("Simulation hooks must be used within a SimulationsProvider");
  }
  return ctx;
};

// ── Consumer hooks ────────────────────────────────────────────────────────────

// The simulation state of the widget's own version (A/B/C). Resolves via the
// nearest VersionContext (default slot 0 = version A).
// eslint-disable-next-line react-refresh/only-export-components
export const useSimulation = (): SimContextValue => {
  const ctx = useSimulationsContext();
  const version = useContext(VersionContext);
  return ctx.sims[version] ?? ctx.sims[0];
};

// The config of the widget's own version, with shared fields merged in.
// eslint-disable-next-line react-refresh/only-export-components
export const useSimConfig = (): SimConfigValue => {
  const ctx = useSimulationsContext();
  const version = useContext(VersionContext);
  return ctx.configs[version] ?? ctx.configs[0];
};

export type SimulationSlot = {
  index: number;
  letter: string;
  sim: SimContextValue;
  config: SimConfigValue;
};

// Every active slot, for singleton widgets that act on / merge all versions
// (controls, speed, charts, chrono).
// eslint-disable-next-line react-refresh/only-export-components
export const useSimulations = (): { slots: SimulationSlot[]; activeCount: number } => {
  const ctx = useSimulationsContext();
  const slots: SimulationSlot[] = [];
  for (let i = 0; i < ctx.activeCount; i++) {
    slots.push({
      index: i,
      letter: VERSION_LETTERS[i] ?? String(i),
      sim: ctx.sims[i],
      config: ctx.configs[i],
    });
  }
  return { slots, activeCount: ctx.activeCount };
};

// Version metadata for the consuming widget. `label` is "B - " when more than
// one version is active, otherwise "" (no prefix for a lone simulation).
// eslint-disable-next-line react-refresh/only-export-components
export const useWidgetVersion = (): { index: number; letter: string; label: string } => {
  const ctx = useContext(SimulationsContext);
  const version = useContext(VersionContext);
  const activeCount = ctx?.activeCount ?? 1;
  const letter = VERSION_LETTERS[version] ?? "A";
  return { index: version, letter, label: activeCount > 1 ? `${letter} - ` : "" };
};

// Lets the Grid report how many versions are in use. Reads the stable setter
// context so the Grid does not re-render on simulation updates.
// eslint-disable-next-line react-refresh/only-export-components
export const useSetActiveCount = (): ((n: number) => void) =>
  useContext(SetActiveCountContext);
