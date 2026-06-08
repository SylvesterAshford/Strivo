"use client";

import type { ReactNode } from "react";
import { Text, type RNStyle } from "@/rn";
import { colors, type } from "@/theme/tokens";

// On the web the font stacks already fall back to Noto Sans Myanmar per glyph
// (see FONT_FAMILY_MAP in src/rn), so we don't swap families. But Burmese still
// wants zero letter-spacing (positive tracking shatters syllable clusters) and
// a roomier line-height so stacked diacritics aren't clipped by overflow:hidden
// ancestors (gradient cards, etc.).
const BURMESE_RE = /[က-႟]/;

type Variant = keyof typeof type;
type ColorKey = "primary" | "secondary" | "tertiary" | "onDark" | "accent";

const COLOR_MAP: Record<ColorKey, string> = {
  primary: colors.text.primary,
  secondary: colors.text.secondary,
  tertiary: colors.text.tertiary,
  onDark: colors.text.onDark,
  accent: colors.accent.base,
};

export interface AppTextProps {
  variant?: Variant;
  color?: ColorKey;
  style?: RNStyle;
  children?: ReactNode;
  numberOfLines?: number;
  onPress?: () => void;
}

function flattenText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join("");
  return "";
}

export function AppText({ variant = "body", color = "primary", style, children, numberOfLines, onPress }: AppTextProps) {
  const base = type[variant] as Record<string, unknown>;
  const isBurmese = BURMESE_RE.test(flattenText(children));

  const overrides: Record<string, unknown> = { color: COLOR_MAP[color] };
  if (isBurmese) {
    overrides.letterSpacing = "normal";
    const lh = base.lineHeight as number | undefined;
    const fs = base.fontSize as number | undefined;
    if (lh) overrides.lineHeight = Math.max(Math.ceil(lh * 1.5), 24);
    else if (fs) overrides.lineHeight = Math.max(Math.ceil(fs * 1.6), 24);
  }

  return (
    <Text style={[base, overrides, style]} numberOfLines={numberOfLines} onPress={onPress}>
      {children}
    </Text>
  );
}
