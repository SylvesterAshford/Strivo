// Plum Linen design tokens — design.md Part 5.
// Single source of truth for color, spacing, radius, type scale.
// Never use raw color literals in components; always reference these.

export const colors = {
  bg: {
    base: "#F8F4F1", // warm cream, the canvas
    surface: "#FFFFFF", // cards, raised elements
    elevated: "#F2EDE9", // subtle inset, week strip
    iconSoft: "#EDE4ED", // icon containers for attention items (soft plum)
    iconNeutral: "#F0EAE6", // icon containers for neutral items
    track: "#EDE4ED", // progress bar tracks
  },

  // Gradient stops. RN has no CSS gradients — use expo-linear-gradient with these.
  gradient: {
    plumPeach: ["#F0E6F0", "#F7E8E0", "#FCEEE0"] as const, // pinned cards, gauge
    plumPeachLocations: [0, 0.5, 1] as const,
    deepPlum: ["#3A1A4A", "#2D1238"] as const, // dock mic button only
  },

  border: {
    default: "#E8E0DA", // 1px default
    hairline: "rgba(0,0,0,0.05)",
  },

  text: {
    primary: "#2A1F2D", // deep plum-black, all primary text
    secondary: "#7A6B7D", // muted plum-brown, labels and metadata
    tertiary: "#B5A8B8", // axis labels, rank numbers, hints
    onDark: "#F8F4F1", // cream text on the dark dock mic
  },

  accent: {
    base: "#6B2D7B", // rich plum, the brand color
    pressed: "#4F1F5C", // plum-pressed
    soft: "rgba(107, 45, 123, 0.12)", // accent fills, pills, active nav
    glow: "rgba(107, 45, 123, 0.30)", // shadow under mic only
  },

  // Multi-series chart palette. Keep the accent scarce — charts use these.
  chart: {
    plum: "#6B2D7B",
    dustyRose: "#B85C8E",
    sage: "#5C7B6B",
    terracotta: "#C97755",
    dustyBlue: "#7A8FB8",
  },

  // Semantic — used sparingly.
  semantic: {
    positive: "#5C7B6B", // sage
    caution: "#C97755", // muted terracotta
    critical: "#A33D5C", // muted rose, true alerts only
  },
} as const;

// Spacing scale (px). Section padding: 22 horizontal, 24 vertical.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  "2xl": 22,
  "3xl": 24,
  "4xl": 28,
  "5xl": 32,
  sectionX: 22,
  sectionY: 24,
} as const;

export const radius = {
  iconContainer: 12,
  attentionCard: 16,
  pinnedCard: 20,
  goalCard: 24,
  gaugeFrame: 24,
  deviceFrame: 36,
  dock: 50,
} as const;

// Font families — keys map to loaded names in fonts.ts.
export const fonts = {
  serif: "InstrumentSerif",
  mono: "JetBrainsMono",
  sans: "Inter",
  sansMedium: "Inter-Medium",
  burmese: "NotoSansMyanmar",
} as const;

// Type scale — design.md 5.2. Weights cap at 500.
export const type = {
  monoEyebrow: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 10, letterSpacing: 2.0 },
  caption: { fontFamily: fonts.sans, fontSize: 11, lineHeight: 15.4 },
  body: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18.2 },
  bodyMedium: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 18.2 },
  title: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 18.2 },
  subhead: { fontFamily: fonts.sansMedium, fontSize: 18, lineHeight: 23.4 },
  gaugeLabel: { fontFamily: fonts.serif, fontSize: 14, fontStyle: "italic" as const },
  serifMd: { fontFamily: fonts.serif, fontSize: 18 },
  serifLg: { fontFamily: fonts.serif, fontSize: 24 },
  serifXl: { fontFamily: fonts.serif, fontSize: 30 },
  serifDisplay: { fontFamily: fonts.serif, fontSize: 52 },
  serifUnit: { fontFamily: fonts.serif, fontSize: 20, fontStyle: "italic" as const },
} as const;

export const theme = { colors, spacing, radius, fonts, type } as const;
export type Theme = typeof theme;
