import type { ReactNode } from "react";
import type { SimLocation, StepState } from "./simulation.type";

export type StatusInfo = { text: string; color: string };

export type SparklineProps = { series: number[]; color: string };

export type MetricDeltaInfo = { text: string; color: string };

export type MetricDeltaOptions = { higherIsBetter: boolean; digits: number };

export type MetricCardProps = {
  title: string;
  value: ReactNode;
  suffix?: string;
  series?: number[];
  color?: string;
  delta: MetricDeltaInfo;
  help: string;
};

export type ChartMetric = "reward" | "steps" | "epsilon";

export type EpisodeChartProps = { metric: ChartMetric };

export type ChartHoverPoint = {
  letter: string;
  color: string;
  sy: number;
  val: number;
};

export type ChartHover = { sx: number; ep: number; points: ChartHoverPoint[] };

export type HyperParamField = {
  label: string;
  value: number;
  set: (n: number) => void;
  step: number;
  min?: number;
  max?: number;
};

export type DonutProps = { rate: number | null; label: string };

export type ChronoSegProps = { value: string; dim?: boolean };

export type WidgetHelpProps = { content: string };

export type StatEntry = [label: string, value: string];

export type SinglePassengerProps = {
  step: StepState | null;
  locations: SimLocation[];
  passengerInTaxi: number;
};

export type DoublePassengersProps = SinglePassengerProps & {
  passengerDelivered: number;
};

export type LayerGroup = [number, number];

export type NetworkEdge = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
};
