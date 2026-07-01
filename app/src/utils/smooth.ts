// Trailing moving average — turns the spiky per-episode series into the smooth
// running curve (cf. the "Smoothed (w=100)" reference). Early points average
// over the values seen so far, so the curve starts cleanly instead of at 0.
export const movingAverage = (values: number[], window: number): number[] => {
  if (window <= 1 || values.length === 0) return values.slice();
  const out: number[] = new Array(values.length);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    out[i] = sum / Math.min(i + 1, window);
  }
  return out;
};

// Window scaled to the series length: enough to tame the noise without flattening
// the trend. ~1/15 of the points, clamped to a sensible range.
export const smoothWindow = (length: number): number =>
  Math.max(2, Math.min(100, Math.round(length / 15)));
