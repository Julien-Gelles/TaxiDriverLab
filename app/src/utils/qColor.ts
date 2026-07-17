import type { Rgb } from "../types";

export const qValueToColor = (q: number, qMin: number, qMax: number): Rgb => {
  const white: Rgb = [255, 255, 255];
  if (Math.abs(q) < 1e-9) return white;
  if (qMax - qMin < 1e-9) return white;

  if (q <= 0) {
    // Blue (min) -> white (0)
    if (qMin >= 0) return white;
    const t = Math.max(0, Math.min(1, q / qMin)); // 1 at min, 0 at 0
    const c = Math.round(255 * (1 - t));
    return [c, c, 255];
  }
  // White (0) -> red (max)
  if (qMax <= 0) return white;
  const t = Math.max(0, Math.min(1, q / qMax)); // 0 at 0, 1 at max
  const c = Math.round(255 * (1 - t));
  return [255, c, c];
};

export const rgbCss = ([r, g, b]: Rgb): string => `rgb(${r}, ${g}, ${b})`;

const BLUE: Rgb = [59, 130, 246];
const GREY: Rgb = [16, 15, 11];
const YELLOW: Rgb = [232, 180, 0];
export const GREEN: Rgb = [34, 197, 94];

const lerp = (a: Rgb, b: Rgb, t: number): Rgb => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

export const qValueToBlueYellow = (
  q: number,
  qMin: number,
  qMax: number,
  demo = false,
): Rgb => {
  if (q < 0 && qMin < 0) {
    // Grey (at 0) → blue (at the most negative value).
    const t = Math.max(0, Math.min(1, q / qMin));
    return lerp(GREY, BLUE, t);
  }
  if (q > 0 && qMax > 0) {
    // Grey (at 0) → yellow/green (at the most positive value).
    const t = Math.max(0, Math.min(1, q / qMax));
    return lerp(GREY, demo ? GREEN : YELLOW, t);
  }
  return GREY;
};
