import { View, Text as RNText } from "react-native";
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
      <RNText style={[SIZE_MAP[size], { color: colors.text.primary }]}>{value}</RNText>
      {unit ? (
        <RNText style={[type.serifUnit, { color: colors.text.secondary, marginLeft: 6, marginBottom: 6 }]}>
          {unit}
        </RNText>
      ) : null}
    </View>
  );
}
