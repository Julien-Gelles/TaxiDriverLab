import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  ChildrenProps,
  LayoutItem,
  LayoutSaveInput,
  SavedLayout,
  SavedLayoutsContextValue,
} from "../types";

export const MAX_SAVED_LAYOUT_SLOTS = 4;
const STORAGE_KEY = "taxi_saved_layouts";
const LAST_KEY = "taxi_last_layout";
const FILE_VERSION = 1;

const SavedLayoutsContext = createContext<SavedLayoutsContextValue | null>(
  null,
);

const isLayoutItem = (v: unknown): v is LayoutItem => {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.type === "string" &&
    typeof o.x === "number" &&
    typeof o.y === "number" &&
    typeof o.w === "number" &&
    typeof o.h === "number"
  );
};

const isValidLayout = (v: unknown): v is SavedLayout => {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.name === "string" &&
    Array.isArray(o.items) &&
    o.items.length > 0 &&
    o.items.every(isLayoutItem)
  );
};

const loadPersisted = (): SavedLayout[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidLayout).map((l) => ({ ...l, persisted: true }));
  } catch {
    return [];
  }
};

const writePersisted = (layouts: SavedLayout[]) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(layouts.filter((l) => l.persisted)),
    );
  } catch {
    /* quota / unavailable — the in-memory list still works this session */
  }
};

const loadLastLayout = (): LayoutItem[] | null => {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.every(isLayoutItem)
      ? parsed
      : null;
  } catch {
    return null;
  }
};

const writeLastLayout = (items: LayoutItem[]) => {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(items));
  } catch {
    /* quota / unavailable — ignore */
  }
};

const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sl_${Date.now()}_${Math.random().toString(36).slice(2)}`;

// Make `name` unique: increment a trailing "-<number>" or append "-1".
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

const downloadJson = (layout: SavedLayout) => {
  const payload = {
    version: FILE_VERSION,
    name: layout.name,
    items: layout.items,
    createdAt: layout.createdAt,
  };
  const blob = new Blob([JSON.stringify(payload)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${layout.name || "layout"}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const SavedLayoutsProvider = ({ children }: ChildrenProps) => {
  const [layouts, setLayouts] = useState<SavedLayout[]>(() => loadPersisted());
  const [lastLayout] = useState<LayoutItem[] | null>(() => loadLastLayout());
  const setLastLayout = useCallback(
    (items: LayoutItem[]) => writeLastLayout(items),
    [],
  );

  useEffect(() => {
    writePersisted(layouts);
  }, [layouts]);

  const make = useCallback(
    (input: LayoutSaveInput, persisted: boolean): SavedLayout => ({
      id: newId(),
      name: input.name.trim() || "layout",
      items: input.items,
      persisted,
      createdAt: Date.now(),
    }),
    [],
  );

  const saveLocal = useCallback(
    (input: LayoutSaveInput): boolean => {
      let ok = false;
      setLayouts((prev) => {
        if (prev.length >= MAX_SAVED_LAYOUT_SLOTS) return prev;
        ok = true;
        const name = uniqueName(input.name, new Set(prev.map((l) => l.name)));
        return [...prev, make({ name, items: input.items }, true)];
      });
      return ok;
    },
    [make],
  );

  const saveFile = useCallback(
    (input: LayoutSaveInput) => {
      const layout = make(input, false);
      downloadJson(layout);
      setLayouts((prev) =>
        prev.length >= MAX_SAVED_LAYOUT_SLOTS
          ? prev
          : [
              ...prev,
              {
                ...layout,
                name: uniqueName(layout.name, new Set(prev.map((l) => l.name))),
              },
            ],
      );
    },
    [make],
  );

  const exportFile = useCallback(
    (id: string) => {
      const layout = layouts.find((l) => l.id === id);
      if (layout) downloadJson(layout);
    },
    [layouts],
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
        name:
          typeof o?.name === "string"
            ? o.name
            : file.name.replace(/\.json$/i, ""),
        items: o?.items,
      };
      if (!isValidLayout({ ...candidate, persisted: false })) return false;
      if (layouts.length >= MAX_SAVED_LAYOUT_SLOTS) return false;
      setLayouts((prev) => {
        if (prev.length >= MAX_SAVED_LAYOUT_SLOTS) return prev;
        const name = uniqueName(
          candidate.name,
          new Set(prev.map((l) => l.name)),
        );
        return [
          ...prev,
          make({ name, items: candidate.items as LayoutItem[] }, false),
        ];
      });
      return true;
    },
    [make, layouts],
  );

  const remove = useCallback((id: string) => {
    setLayouts((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const value = useMemo<SavedLayoutsContextValue>(
    () => ({
      layouts,
      maxSlots: MAX_SAVED_LAYOUT_SLOTS,
      hasFreeSlot: layouts.length < MAX_SAVED_LAYOUT_SLOTS,
      saveLocal,
      saveFile,
      exportFile,
      importFile,
      remove,
      lastLayout,
      setLastLayout,
    }),
    [
      layouts,
      saveLocal,
      saveFile,
      exportFile,
      importFile,
      remove,
      lastLayout,
      setLastLayout,
    ],
  );

  return (
    <SavedLayoutsContext.Provider value={value}>
      {children}
    </SavedLayoutsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSavedLayouts = (): SavedLayoutsContextValue => {
  const ctx = useContext(SavedLayoutsContext);
  if (!ctx) {
    throw new Error(
      "useSavedLayouts must be used within a SavedLayoutsProvider",
    );
  }
  return ctx;
};
