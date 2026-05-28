import { TextInput, type TextInputProps } from "react-native";
import { colors, radius, spacing, type } from "@/theme/tokens";

export function TextField({ style, ...props }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.text.tertiary}
      style={[
        {
          backgroundColor: colors.bg.surface,
          borderWidth: 1,
          borderColor: colors.border.default,
          borderRadius: radius.attentionCard,
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xl,
          fontFamily: type.body.fontFamily,
          fontSize: 16,
          color: colors.text.primary,
        },
        style,
      ]}
      {...props}
    />
  );
}
