import { Pressable, type PressableProps, View } from "react-native";
import { colors, radius, spacing } from "@/theme/tokens";
import { AppText } from "./AppText";

type ButtonVariant = "primary" | "secondary";

// Primary = plum fill, cream label. Secondary = bordered, plum label.
// Card-tap motion: scale 0.98 on press (design.md 5.4).
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
          backgroundColor: isPrimary
            ? pressed
              ? colors.accent.pressed
              : colors.accent.base
            : "transparent",
          borderWidth: isPrimary ? 0 : 1,
          borderColor: colors.border.default,
          borderRadius: radius.attentionCard,
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing["3xl"],
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        typeof style === "function" ? style({ pressed } as never) : style,
      ]}
      {...rest}
    >
      <View>
        <AppText variant="title" color={isPrimary ? "onDark" : "accent"}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}
