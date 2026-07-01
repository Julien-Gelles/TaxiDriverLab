import { useCallback, useEffect, useState } from "react";

// Which pretrained models the backend found in core/save/.
export type PretrainedEntry = { agent: string; double: boolean };

// REST origin derived from the WS URL (ws://host/ws → http://host).
const API_BASE = (() => {
  const ws =
    (import.meta.env.VITE_SIM_WS_URL as string | undefined) ??
    "ws://127.0.0.1:8000/ws";
  return ws.replace(/^ws/, "http").replace(/\/ws$/, "");
})();

export const usePretrained = () => {
  const [available, setAvailable] = useState<PretrainedEntry[]>([]);

  const refresh = useCallback(() => {
    fetch(`${API_BASE}/pretrained`)
      .then((r) => r.json())
      .then((data: PretrainedEntry[]) => setAvailable(Array.isArray(data) ? data : []))
      .catch(() => setAvailable([]));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // True if a saved model exists for (agent, passenger-count).
  const has = useCallback(
    (agent: string, double: boolean) =>
      available.some((e) => e.agent === agent && e.double === double),
    [available]
  );

  return { available, refresh, has };
};
