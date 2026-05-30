import { Pressable, type PressableProps, View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing } from "@/theme/tokens";
import { AppText } from "./AppText";

type ButtonVariant = "primary" | "secondary";

// Primary = lavender brand gradient, white label. Secondary = bordered, accent
// label. Card-tap motion: scale 0.98 on press (design.md 5.4).
export function Button({
  label,
  variant = "primary",
  style,
  ...rest
}: PressableProps & { label: string; variant?: ButtonVariant }) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
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
        typeof style === "function" ? style({ pressed } as never) : style,
      ]}
      {...rest}
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
