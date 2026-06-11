// Plum Linen design tokens — design.md Part 5.
// Single source of truth for color, spacing, radius, type scale.
// Never use raw color literals in components; always reference these.

// Slate/Ink — a restrained, finance-grade monochrome system. White surfaces,
// cool-gray canvas, deep slate ink as the single accent (buttons, active nav,
// icons). Hue is reserved for data: green = up/sales, amber = caution, red =
// critical. Professional, austere, business-friendly.
export const colors = {
  bg: {
    base: "#F8FAFC", // cool light-gray canvas
    surface: "#FFFFFF", // cards, raised elements
    elevated: "#F1F5F9", // subtle inset, week strip, chips
    iconSoft: "#F1F5F9", // icon containers for attention items
    iconNeutral: "#F1F5F9", // icon containers for neutral items
    track: "#E2E8F0", // progress bar tracks
  },

  // Gradient stops. On web these map to CSS linear-gradient via <LinearGradient>.
  // Ink stops sit close together so primary surfaces read as near-solid slate.
  gradient: {
    plumPeach: ["#F8FAFC", "#F1F5F9", "#F8FAFC"] as const, // soft neutral panels
    plumPeachLocations: [0, 0.5, 1] as const,
    deepPlum: ["#334155", "#1E293B"] as const, // dock add button
    // Primary CTA: deep slate ink, white label.
    brand: ["#334155", "#1E293B"] as const,
    brandPressed: ["#1E293B", "#0F172A"] as const,
  },

  border: {
    default: "#E5E7EB", // 1px default
    hairline: "rgba(15,23,42,0.06)",
  },

  text: {
    primary: "#0F172A", // slate ink, all primary text
    secondary: "#64748B", // slate-gray, labels and metadata
    tertiary: "#6B7280", // hints / axis labels — darkened to clear WCAG 4.5:1 on white
    onDark: "#FFFFFF", // white text on filled ink surfaces
  },

  accent: {
    // The single accent is deep slate ink — readable on white, serious.
    base: "#1E293B",
    pressed: "#0F172A",
    soft: "rgba(30, 41, 59, 0.07)", // active nav, pills, soft fills
    glow: "rgba(15, 23, 42, 0.16)", // subtle shadow under raised actions
    tint: "#334155", // soft identity uses (logo wordmark, etc.)
  },

  // Brand identity accent — the logo's violet. Used ONLY for identity +
  // interactive states (wordmark, active nav, focus outlines), never for the
  // slate theme surfaces or the black/white button fills.
  identity: {
    purple: "#7C3AED", // logo violet — icon + text on active states
    soft: "rgba(124,58,237,0.10)", // soft fill behind active items
    border: "rgba(124,58,237,0.32)", // liquid-glass outline
  },

  // Multi-series chart palette — muted but distinct, professional.
  chart: {
    plum: "#475569", // primary slate-blue series
    dustyRose: "#9F1239", // deep rose
    sage: "#15803D", // green
    terracotta: "#B45309", // amber
    dustyBlue: "#1D4ED8", // blue
  },

  // Semantic — finance-grade green/amber/red.
  semantic: {
    positive: "#15803D", // green — sales, profit, up
    caution: "#B45309", // amber — watch
    critical: "#B91C1C", // red — alerts, losses
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

// Font families — keys map to the next/font CSS variables wired in layout.tsx
// (see resolveStyle's FONT_FAMILY_MAP in src/rn). Each stack ends in the
// Myanmar fallback so Burmese glyphs render without tofu.
export const fonts = {
  serif: "InstrumentSerif",
  mono: "JetBrainsMono",
  sans: "Inter",
  sansMedium: "Inter-Medium",
  // Distinctive grotesk for headings/titles — gives the UI a deliberate
  // typographic voice instead of the generic Inter-everywhere "AI default".
  grotesk: "SpaceGrotesk",
  burmese: "NotoSansMyanmar",
} as const;

// Type scale — design.md 5.2. Body stays Inter; titles/subheads use the grotesk
// display face; big numerals use Instrument Serif. Weights cap at 600.
export const type = {
  monoEyebrow: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 10, letterSpacing: 2.0 },
  caption: { fontFamily: fonts.sans, fontSize: 11, lineHeight: 15.4 },
  body: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18.2 },
  bodyMedium: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 18.2 },
  title: { fontFamily: fonts.grotesk, fontSize: 14, lineHeight: 18.2, fontWeight: 600, letterSpacing: -0.1 },
  subhead: { fontFamily: fonts.grotesk, fontSize: 19, lineHeight: 24, fontWeight: 600, letterSpacing: -0.3 },
  gaugeLabel: { fontFamily: fonts.serif, fontSize: 14, fontStyle: "italic" as const },
  serifMd: { fontFamily: fonts.serif, fontSize: 18 },
  serifLg: { fontFamily: fonts.serif, fontSize: 24 },
  serifXl: { fontFamily: fonts.serif, fontSize: 30 },
  serifDisplay: { fontFamily: fonts.serif, fontSize: 52 },
  serifUnit: { fontFamily: fonts.serif, fontSize: 20, fontStyle: "italic" as const },
} as const;

export const theme = { colors, spacing, radius, fonts, type } as const;
export type Theme = typeof theme;
