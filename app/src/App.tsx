import { useEffect } from "react";

import { Grid } from "./components/Grid";
import { SimulationsProvider, useSimConfig } from "./hooks/useSimulation";
import { SavedAgentsProvider } from "./hooks/useSavedAgents";
import { SavedLayoutsProvider } from "./hooks/useSavedLayouts";
import { Backdrop, Blob, DRIFTS } from "./styles";

const DemoModeSync = () => {
  const { mode } = useSimConfig();
  useEffect(() => {
    document.documentElement.dataset.demo = mode === "demo" ? "true" : "false";
  }, [mode]);
  return null;
};

const BLOBS_TRAIN = [
  {
    size: "46vw",
    color: "#EFCB4D",
    top: "-26vh",
    left: "-16vw",
    drift: 0,
    dur: "1.4s",
    delay: "0s",
  },
  {
    size: "44vw",
    color: "#E8B400",
    top: "-24vh",
    left: "72vw",
    drift: 1,
    dur: "2s",
    delay: "-5s",
  },
  {
    size: "42vw",
    color: "#F5D97A",
    top: "70vh",
    left: "-14vw",
    drift: 2,
    dur: "1.1s",
    delay: "-9s",
  },
  {
    size: "40vw",
    color: "#B98800",
    top: "72vh",
    left: "74vw",
    drift: 3,
    dur: "1.7s",
    delay: "-3s",
  },
  {
    size: "34vw",
    color: "#4277e0",
    top: "-22vh",
    left: "34vw",
    drift: 3,
    dur: "1.5s",
    delay: "-6s",
    opacity: 0.7,
    blend: "normal",
  },
  {
    size: "34vw",
    color: "#8ee022",
    top: "68vh",
    left: "34vw",
    drift: 2,
    dur: "1.9s",
    delay: "-2s",
    opacity: 0.7,
    blend: "normal",
  },
  {
    size: "30vw",
    color: "#19db3a",
    top: "30vh",
    left: "-18vw",
    drift: 1,
    dur: "1.3s",
    delay: "-4s",
    opacity: 0.62,
    blend: "normal",
  },
  {
    size: "30vw",
    color: "#1f5fdf",
    top: "30vh",
    left: "84vw",
    drift: 0,
    dur: "1.8s",
    delay: "-8s",
    opacity: 0.62,
    blend: "normal",
  },
];

const BLOBS_DEMO = [
  {
    size: "46vw",
    color: "#4ade80",
    top: "-26vh",
    left: "-16vw",
    drift: 0,
    dur: "1.4s",
    delay: "0s",
  },
  {
    size: "44vw",
    color: "#22c55e",
    top: "-24vh",
    left: "72vw",
    drift: 1,
    dur: "2s",
    delay: "-5s",
  },
  {
    size: "42vw",
    color: "#6ee7b7",
    top: "70vh",
    left: "-14vw",
    drift: 2,
    dur: "1.1s",
    delay: "-9s",
  },
  {
    size: "40vw",
    color: "#10b981",
    top: "72vh",
    left: "74vw",
    drift: 3,
    dur: "1.7s",
    delay: "-3s",
  },
  {
    size: "34vw",
    color: "#4277e0",
    top: "-22vh",
    left: "34vw",
    drift: 3,
    dur: "1.5s",
    delay: "-6s",
    opacity: 0.7,
    blend: "normal",
  },
  {
    size: "34vw",
    color: "#34d399",
    top: "68vh",
    left: "34vw",
    drift: 2,
    dur: "1.9s",
    delay: "-2s",
    opacity: 0.7,
    blend: "normal",
  },
  {
    size: "30vw",
    color: "#2dd4bf",
    top: "30vh",
    left: "-18vw",
    drift: 1,
    dur: "1.3s",
    delay: "-4s",
    opacity: 0.62,
    blend: "normal",
  },
  {
    size: "30vw",
    color: "#1f5fdf",
    top: "30vh",
    left: "84vw",
    drift: 0,
    dur: "1.8s",
    delay: "-8s",
    opacity: 0.62,
    blend: "normal",
  },
];

const BackdropContent = () => {
  const { mode } = useSimConfig();
  const BLOBS = mode === "demo" ? BLOBS_DEMO : BLOBS_TRAIN;

  return (
    <Backdrop aria-hidden>
      {BLOBS.map((b, i) => (
        <Blob
          key={i}
          $size={b.size}
          $color={b.color}
          $top={b.top}
          $left={b.left}
          $anim={DRIFTS[b.drift]}
          $dur={b.dur}
          $delay={b.delay}
          $opacity={b.opacity}
          $blend={b.blend}
        />
      ))}
    </Backdrop>
  );
};

export const App = () => {
  return (
    <SimulationsProvider>
      <BackdropContent />
      <DemoModeSync />
      <SavedAgentsProvider>
        <SavedLayoutsProvider>
          <Grid />
        </SavedLayoutsProvider>
      </SavedAgentsProvider>
    </SimulationsProvider>
  );
};
