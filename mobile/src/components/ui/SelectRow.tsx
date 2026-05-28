import { Pressable, View } from "react-native";
import { AppText } from "./AppText";
import { colors, radius, spacing } from "@/theme/tokens";

// Single-select row used in onboarding. Selected = plum border + soft fill.
export function SelectRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderWidth: 1,
          borderColor: selected ? colors.accent.base : colors.border.default,
          backgroundColor: selected ? colors.accent.soft : colors.bg.surface,
          borderRadius: radius.attentionCard,
          paddingVertical: spacing.xl,
          paddingHorizontal: spacing["2xl"],
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <AppText variant="bodyMedium" color={selected ? "accent" : "primary"}>
          {label}
        </AppText>
        {selected ? (
          <View
            style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent.base }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}
