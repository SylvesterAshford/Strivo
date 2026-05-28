import { ScrollView, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "@/theme/tokens";

// Cream canvas with safe-area top inset and bottom padding so content clears
// the floating dock (~88px: dock height + 18px margin).
const DOCK_CLEARANCE = 96;

export function Screen({
  children,
  scroll = true,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  const padding: ViewStyle = {
    paddingTop: insets.top + spacing.lg,
    paddingHorizontal: spacing.sectionX,
    paddingBottom: DOCK_CLEARANCE + insets.bottom,
  };

  if (!scroll) {
    return (
      <View style={[{ flex: 1, backgroundColor: colors.bg.base }, padding, contentStyle]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg.base }}
      contentContainerStyle={[padding, contentStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
