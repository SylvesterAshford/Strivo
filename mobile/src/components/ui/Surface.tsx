import { View, type ViewProps } from "react-native";
import { colors, radius as radiusTokens } from "@/theme/tokens";

// White card surface with 1px border. No shadow (design rejects shadows except
// dock + mic). `radius` keys map to the radius scale.
export function Surface({
  radius = "attentionCard",
  style,
  children,
  ...rest
}: ViewProps & { radius?: keyof typeof radiusTokens }) {
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
      {...rest}
    >
      {children}
    </View>
  );
}
