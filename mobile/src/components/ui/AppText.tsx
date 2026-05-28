import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { colors, type } from "@/theme/tokens";

// Myanmar stacked diacritics extend ~60% above Latin cap-height.
// When a variant's lineHeight is set for Latin, multiply it to give Myanmar
// glyphs enough vertical room so ancestor overflow:hidden containers don't clip.
// 2.0× keeps Myanmar stacked diacritics inside the line box on iOS so
// ancestor overflow:hidden containers (gradient cards, etc.) don't clip them.
const BURMESE_LH_SCALE = 2.0;
// For very small variants (mono-eyebrow at 10px), 2× still clips because the
// absolute height (~20px) is below what stacked diacritics need. Floor it.
const BURMESE_LH_FLOOR = 26;
// For variants without an explicit lineHeight (display serifs like serifLg,
// serifDisplay, serifUnit, gaugeLabel), compute one from fontSize. Burmese
// stacked glyphs need ~1.7× fontSize minimum or ascenders clip on iOS.
const BURMESE_LH_FROM_SIZE = 1.7;

type Variant = keyof typeof type;
type ColorKey = "primary" | "secondary" | "tertiary" | "onDark" | "accent";

// Burmese codepoints U+1000–U+109F. Swap every font family to its Myanmar
// equivalent so the script renders without tofu.
const BURMESE_RE = /[က-႟]/;

const FAMILY_SWAP: Record<string, string> = {
  InstrumentSerif: "NotoSansMyanmar",
  "InstrumentSerif-Italic": "NotoSansMyanmar",
  Inter: "NotoSansMyanmar",
  "Inter-Medium": "NotoSansMyanmar-Medium",
  JetBrainsMono: "NotoSansMyanmar", // eyebrows with Burmese section labels
};

const COLOR_MAP: Record<ColorKey, string> = {
  primary: colors.text.primary,
  secondary: colors.text.secondary,
  tertiary: colors.text.tertiary,
  onDark: colors.text.onDark,
  accent: colors.accent.base,
};

export interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: ColorKey;
}

function flattenText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join("");
  return "";
}

export function AppText({
  variant = "body",
  color = "primary",
  style,
  children,
  ...rest
}: AppTextProps) {
  const base = type[variant] as TextStyle;
  // children can be a string, a number, or an array (mixed template literals).
  // Flatten any leaf strings so Burmese detection still fires for mixed content
  // like `{formatCurrency(...)} · {my.reports.txCount(n)}`.
  const text = flattenText(children);
  const isBurmese = BURMESE_RE.test(text);

  const family =
    isBurmese && base.fontFamily && FAMILY_SWAP[base.fontFamily]
      ? FAMILY_SWAP[base.fontFamily]
      : base.fontFamily;

  const burmeseLineHeight = (() => {
    if (!isBurmese) return undefined;
    if (base.lineHeight) {
      return Math.max(Math.ceil(base.lineHeight * BURMESE_LH_SCALE), BURMESE_LH_FLOOR);
    }
    if (base.fontSize) {
      return Math.max(Math.ceil(base.fontSize * BURMESE_LH_FROM_SIZE), BURMESE_LH_FLOOR);
    }
    return undefined;
  })();
  // Burmese never wants letterSpacing — positive tracking shatters syllable
  // clusters (e.g. "ဖော" becomes "ဖော က်"). Zero it out whenever the script
  // is detected, regardless of variant.
  const burmeseOverride: TextStyle | null = isBurmese
    ? {
        ...(burmeseLineHeight ? { lineHeight: burmeseLineHeight } : null),
        letterSpacing: 0,
      }
    : null;

  return (
    <RNText
      style={[base, { fontFamily: family, color: COLOR_MAP[color] }, burmeseOverride, style]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
