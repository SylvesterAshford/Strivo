"use client";

import { Pressable, View, LinearGradient, StyleSheet, type RNStyle } from "@/rn";
import { colors, radius, spacing } from "@/theme/tokens";
import { AppText } from "./AppText";

type ButtonVariant = "primary" | "secondary";

// Primary = lavender brand gradient, white label. Secondary = bordered, accent
// label. Card-tap motion: scale 0.98 on press (design.md 5.4).
export function Button({
  label,
  variant = "primary",
  style,
  onPress,
  disabled,
}: {
  label: string;
  variant?: ButtonVariant;
  style?: RNStyle;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderRadius: radius.attentionCard,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          overflow: "hidden",
        },
        !isPrimary && {
          borderWidth: 1,
          borderColor: colors.border.default,
          backgroundColor: colors.bg.surface,
        },
        style,
      ]}
    >
      {({ pressed }) =>
        isPrimary ? (
          <LinearGradient
            colors={pressed ? colors.gradient.brandPressed : colors.gradient.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.inner}
          >
            <AppText variant="title" color="onDark">
              {label}
            </AppText>
          </LinearGradient>
        ) : (
          <View style={styles.inner}>
            <AppText variant="title" color="accent">
              {label}
            </AppText>
          </View>
        )
      }
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inner: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing["3xl"],
    alignItems: "center",
    justifyContent: "center",
  },
});
