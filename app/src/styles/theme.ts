export const theme = {
  ink: "#F4F1E8",
  inkSoft: "#A8A499",
  grey: "#6F6B60",
  onAccent: "#15140F",

  yellow: "#E8B400",
  yellowGlow: "#EFCB4D",
  yellowDark: "#B98800",

  accentSoft: "rgba(232, 180, 0, 0.13)",
  page: "#100F0B",
  cream: "#1A1813",
  creamDark: "#221F18",

  asphalt: "#14120C",
  asphaltLine: "rgba(255, 255, 255, 0.06)",

  white: "#FFFFFF",
  success: "#6FCF73",
  danger: "#E8705F",

  loc: {
    0: "#E0564A",
    1: "#4CAF7D",
    2: "#E8B400",
    3: "#4A78D6",
  } as Record<number, string>,

  line: "rgba(255, 255, 255, 0.07)",
  designCell: 86,

  appMargin: 22,
  gridPadding: 14,

  radius: 16,
  border: "1px solid rgba(255, 255, 255, 0.07)",
  borderThick: "1px solid rgba(255, 255, 255, 0.10)",
  shadow: "0 10px 30px rgba(0, 0, 0, 0.45)",
  shadowSm: "0 2px 10px rgba(0, 0, 0, 0.35)",
} as const;
