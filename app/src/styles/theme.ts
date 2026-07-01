// Dark dashboard theme aligned with the Claude-design handoff. Warm near-black
// surfaces, hairline borders, a golden taxi accent, and a soft ambient glow.
// Token NAMES are kept stable so existing inline styles keep working.

export const theme = {
  // Foreground.
  ink: "#F4F1E8", // primary text / SVG strokes (--txt)
  inkSoft: "#A8A499", // secondary text (--txt-2)
  grey: "#6F6B60", // muted labels / captions / inactive (--txt-3)
  onAccent: "#15140F", // text/icons on a bright accent fill

  // Accent (golden taxi yellow).
  yellow: "#E8B400", // primary accent (--accent)
  yellowGlow: "#EFCB4D", // lighter accent for gradients/highlights (--accent-2)
  yellowDark: "#B98800", // darker accent (gradient ends, pause state)
  accentSoft: "rgba(232, 180, 0, 0.13)", // translucent accent wash

  // Surfaces.
  page: "#100F0B", // app background (--bg)
  cream: "#1A1813", // card / panel surface (--panel)
  creamDark: "#221F18", // nested / elevated surface (--panel-2)

  // Terrain board.
  asphalt: "#14120C",
  asphaltLine: "rgba(255, 255, 255, 0.06)",

  white: "#FFFFFF",
  success: "#6FCF73", // positive (--pos)
  danger: "#E8705F", // negative / stop (--neg)

  // Location colours (R, G, Y, B) on the terrain.
  loc: {
    0: "#E0564A", // R
    1: "#4CAF7D", // G
    2: "#E8B400", // Y
    3: "#4A78D6", // B
  } as Record<number, string>,

  // Hairline border colour.
  line: "rgba(255, 255, 255, 0.07)",

  // Reference cell size (px) the widget contents were laid out against. Every
  // widget's content is uniformly scaled by (actualCellSize / designCell) so the
  // visuals keep identical proportions at any window size — a card's title, gaps
  // and inner boxes always occupy the same fraction of the (fixed-ratio) widget.
  designCell: 86,

  // Margin between the app panel and the coloured backdrop (px), on every side.
  appMargin: 22,
  // Padding inside the scrollable dashboard area (subtracted from the grid's
  // column budget — see useGridCount).
  gridPadding: 14,

  radius: 16,
  border: "1px solid rgba(255, 255, 255, 0.07)",
  borderThick: "1px solid rgba(255, 255, 255, 0.10)",
  shadow: "0 10px 30px rgba(0, 0, 0, 0.45)",
  shadowSm: "0 2px 10px rgba(0, 0, 0, 0.35)",
} as const;
