"use client";

import type { ReactNode } from "react";
import { View, type RNStyle } from "@/rn";
import { colors, radius as radiusTokens } from "@/theme/tokens";

// White card surface with 1px border. No shadow (design rejects shadows except
// dock + mic). `radius` keys map to the radius scale.
export function Surface({
  radius = "attentionCard",
  style,
  children,
}: {
  radius?: keyof typeof radiusTokens;
  style?: RNStyle;
  children?: ReactNode;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.bg.surface,
          borderRadius: radiusTokens[radius],
          borderWidth: 1,
          borderColor: colors.border.default,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
