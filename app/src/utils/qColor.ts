// Colour scale ported from core/utils/pygame_stats.py (_q_value_to_color):
// blue = minimum value, white = 0, red = maximum value.
// Returns an [r, g, b] triple (0-255).
export const qValueToColor = (
  q: number,
  qMin: number,
  qMax: number,
): [number, number, number] => {
  const white: [number, number, number] = [255, 255, 255];
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

export const rgbCss = ([r, g, b]: [number, number, number]): string =>
  `rgb(${r}, ${g}, ${b})`;

// Diverging scale used by the Q-table heatmap, anchored at 0: blue for negative
// values, a dark grey matching the panel background near zero (so weak cells
// melt into the surface), and yellow for positive values.
const BLUE: [number, number, number] = [59, 130, 246]; // #3b82f6
const GREY: [number, number, number] = [16, 15, 11]; // ~theme.page
const YELLOW: [number, number, number] = [232, 180, 0]; // theme.yellow (train accent)
export const GREEN: [number, number, number] = [34, 197, 94]; // #22c55e (demo accent)

const lerp = (
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

export const qValueToBlueYellow = (
  q: number,
  qMin: number,
  qMax: number,
  // In demo mode the positive side of the scale is green instead of gold, to
  // match the global accent.
  demo = false,
): [number, number, number] => {
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
