// Plum Linen design tokens — design.md Part 5.
// Single source of truth for color, spacing, radius, type scale.
// Never use raw color literals in components; always reference these.

export const colors = {
  bg: {
    base: "#F8F5FB", // soft lavender-tinted cream, the canvas
    surface: "#FFFFFF", // cards, raised elements
    elevated: "#F1ECF7", // subtle inset, week strip
    iconSoft: "#EFE7FB", // icon containers for attention items (soft lavender)
    iconNeutral: "#F0EAF2", // icon containers for neutral items
    track: "#EBE3F7", // progress bar tracks
  },

  // Gradient stops. RN has no CSS gradients — use expo-linear-gradient with these.
  gradient: {
    plumPeach: ["#EFE7FB", "#F3EAFB", "#FBEFF7"] as const, // pinned cards, gauge
    plumPeachLocations: [0, 0.5, 1] as const,
    deepPlum: ["#7C3AED", "#5B21B6"] as const, // dock mic button only
    // Brand lavender gradient — primary CTAs. Brand color (#BC8EF6) at top,
    // deep readable purple at bottom so white text stays legible.
    brand: ["#BC8EF6", "#7C3AED"] as const,
    brandPressed: ["#A974EE", "#6D28D9"] as const,
  },

  border: {
    default: "#E9E2F1", // 1px default
    hairline: "rgba(0,0,0,0.05)",
  },

  text: {
    primary: "#241B33", // deep violet-black, all primary text
    secondary: "#766B85", // muted violet-grey, labels and metadata
    tertiary: "#B3A8C2", // axis labels, rank numbers, hints
    onDark: "#FFFFFF", // white text on filled brand surfaces
  },

  accent: {
    // Brand identity is lavender (#BC8EF6, see `tint`). For text/icons/solids
    // on white we need contrast, so `base` is a deeper shade of the same hue.
    base: "#7C3AED", // deep lavender — readable on white for text/icons
    pressed: "#6D28D9",
    soft: "rgba(188, 142, 246, 0.16)", // accent fills, pills, active nav
    glow: "rgba(188, 142, 246, 0.40)", // shadow under mic / brand glow
    tint: "#BC8EF6", // the exact brand lavender — logo, soft identity uses
  },

  // Multi-series chart palette. Keep the accent scarce — charts use these.
  chart: {
    plum: "#7C3AED",
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
