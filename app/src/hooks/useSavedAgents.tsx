import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AgentKey, SavedAgent } from "../types";

// User-saved agents: tabular models captured from in-app training runs. Up to
// MAX_SLOTS live in the list at once; persisted ones are mirrored to
// localStorage, session ones (saved-to-file / imported without a free… they
// still take a slot) vanish on reload — the downloaded file is their durable
// copy. See SavedAgent in types for the per-entry semantics.
export const MAX_SAVED_SLOTS = 4;
const STORAGE_KEY = "taxi_saved_agents";
const FILE_VERSION = 1;

// The minimal data needed to mint a new saved agent (id/createdAt are added).
export type SaveInput = {
  name: string;
  agent: AgentKey;
  double: boolean;
  qTable: number[][];
};

type SavedAgentsContextValue = {
  agents: SavedAgent[];
  maxSlots: number;
  hasFreeSlot: boolean;
  // Persist to localStorage and fill a slot. Returns false if no slot is free.
  saveLocal: (input: SaveInput) => boolean;
  // Download a .json file; also fill a (session) slot if one is free.
  saveFile: (input: SaveInput) => void;
  // Download an already-saved agent as a .json file.
  exportFile: (id: string) => void;
  // Import a .json file into a session slot. Resolves false if no slot is free
  // or the file is invalid.
  importFile: (file: File) => Promise<boolean>;
  // Remove from the list; if it was persisted, also drop it from localStorage.
  remove: (id: string) => void;
};

const SavedAgentsContext = createContext<SavedAgentsContextValue | null>(null);

const TABULAR: ReadonlySet<AgentKey> = new Set<AgentKey>(["Q", "S", "M"]);

const isValidSaved = (v: unknown): v is SavedAgent => {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.name === "string" &&
    typeof o.agent === "string" &&
    TABULAR.has(o.agent as AgentKey) &&
    typeof o.double === "boolean" &&
    Array.isArray(o.qTable) &&
    o.qTable.every((row) => Array.isArray(row))
  );
};

const loadPersisted = (): SavedAgent[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidSaved).map((a) => ({ ...a, persisted: true }));
  } catch {
    return [];
  }
};

const writePersisted = (agents: SavedAgent[]) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(agents.filter((a) => a.persisted))
    );
  } catch {
    /* quota exceeded / unavailable — the in-memory list still works this session */
  }
};

const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sa_${Date.now()}_${Math.random().toString(36).slice(2)}`;

// Make `name` unique against `taken`: if it ends with "-<number>", increment
// that number; otherwise append "-1". Keeps bumping until the name is free.
const uniqueName = (name: string, taken: Set<string>): string => {
  if (!taken.has(name)) return name;
  const m = name.match(/^(.*)-(\d+)$/);
  const base = m ? m[1] : name;
  let n = m ? Number(m[2]) + 1 : 1;
  let candidate = `${base}-${n}`;
  while (taken.has(candidate)) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
};

const downloadJson = (agent: SavedAgent) => {
  const payload = {
    version: FILE_VERSION,
    name: agent.name,
    agent: agent.agent,
    double: agent.double,
    qTable: agent.qTable,
    createdAt: agent.createdAt,
  };
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${agent.name || "agent"}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const SavedAgentsProvider = ({ children }: { children: ReactNode }) => {
  const [agents, setAgents] = useState<SavedAgent[]>(() => loadPersisted());

  // Keep localStorage in sync with the persisted subset whenever the list changes.
  useEffect(() => {
    writePersisted(agents);
  }, [agents]);

  const make = useCallback(
    (input: SaveInput, persisted: boolean): SavedAgent => ({
      id: newId(),
      name: input.name.trim() || "agent",
      agent: input.agent,
      double: input.double,
      qTable: input.qTable,
      persisted,
      createdAt: Date.now(),
    }),
    []
  );

  const saveLocal = useCallback(
    (input: SaveInput): boolean => {
      let ok = false;
      setAgents((prev) => {
        if (prev.length >= MAX_SAVED_SLOTS) return prev;
        ok = true;
        return [...prev, make(input, true)];
      });
      return ok;
    },
    [make]
  );

  const saveFile = useCallback(
    (input: SaveInput) => {
      const agent = make(input, false);
      downloadJson(agent);
      // Also occupy a slot if there's room (session entry — the file is durable).
      setAgents((prev) => (prev.length >= MAX_SAVED_SLOTS ? prev : [...prev, agent]));
    },
    [make]
  );

  const exportFile = useCallback(
    (id: string) => {
      const agent = agents.find((a) => a.id === id);
      if (agent) downloadJson(agent);
    },
    [agents]
  );

  const importFile = useCallback(
    async (file: File): Promise<boolean> => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        return false;
      }
      const o = parsed as Record<string, unknown>;
      const candidate = {
        name: typeof o?.name === "string" ? o.name : file.name.replace(/\.json$/i, ""),
        agent: o?.agent,
        double: Boolean(o?.double),
        qTable: o?.qTable,
        persisted: false,
      };
      if (!isValidSaved(candidate)) return false;
      if (agents.length >= MAX_SAVED_SLOTS) return false;
      setAgents((prev) => {
        if (prev.length >= MAX_SAVED_SLOTS) return prev;
        // Dedupe against the freshest list so re-importing the same agent yields
        // "name-1", "name-2", … instead of an identical duplicate.
        const name = uniqueName(candidate.name, new Set(prev.map((a) => a.name)));
        return [
          ...prev,
          make(
            { name, agent: candidate.agent, double: candidate.double, qTable: candidate.qTable },
            false
          ),
        ];
      });
      return true;
    },
    [make, agents]
  );

  const remove = useCallback((id: string) => {
    // Dropping it from the list also drops it from localStorage on the next sync
    // effect (writePersisted only keeps the persisted subset).
    setAgents((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const value = useMemo<SavedAgentsContextValue>(
    () => ({
      agents,
      maxSlots: MAX_SAVED_SLOTS,
      hasFreeSlot: agents.length < MAX_SAVED_SLOTS,
      saveLocal,
      saveFile,
      exportFile,
      importFile,
      remove,
    }),
    [agents, saveLocal, saveFile, exportFile, importFile, remove]
  );

  return (
    <SavedAgentsContext.Provider value={value}>
      {children}
    </SavedAgentsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSavedAgents = (): SavedAgentsContextValue => {
  const ctx = useContext(SavedAgentsContext);
  if (!ctx) {
    throw new Error("useSavedAgents must be used within a SavedAgentsProvider");
  }
  return ctx;
};
