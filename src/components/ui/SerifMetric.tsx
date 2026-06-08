"use client";

import { View, Text } from "@/rn";
import { colors, type } from "@/theme/tokens";

type Size = "md" | "lg" | "xl" | "display";

const SIZE_MAP = {
  md: type.serifMd,
  lg: type.serifLg,
  xl: type.serifXl,
  display: type.serifDisplay,
} as const;

// design.md 7.3 — big numeric value in Instrument Serif with optional italic unit.
export function SerifMetric({
  value,
  unit,
  size = "display",
}: {
  value: string;
  unit?: string;
  size?: Size;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
      <Text style={[SIZE_MAP[size], { color: colors.text.primary, lineHeight: 1 }]}>{value}</Text>
      {unit ? (
        <Text style={[type.serifUnit, { color: colors.text.secondary, marginLeft: 6, marginBottom: 6, lineHeight: 1 }]}>
          {unit}
        </Text>
      ) : null}
    </View>
  );
}
