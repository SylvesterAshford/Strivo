import { View, Image, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { colors, spacing } from "@/theme/tokens";

const LOGO = require("../../../assets/strivo-logo.png");

// Shown while the app is resolving auth + prefetching tab data. Keeps the
// user informed instead of staring at a blank screen.
export function LoadingScreen({ message }: { message?: string }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.center}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <AppText style={styles.wordmark}>Strivo</AppText>
        <ActivityIndicator
          color={colors.accent.tint}
          size="large"
          style={{ marginTop: spacing["3xl"] }}
        />
        {message ? (
          <AppText
            variant="caption"
            color="secondary"
            style={{ marginTop: spacing.lg, textAlign: "center" }}
          >
            {message}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.base,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
  },
  logo: {
    width: 72,
    height: 72,
  },
  wordmark: {
    fontFamily: "Inter-Medium",
    fontSize: 24,
    lineHeight: 36,
    letterSpacing: 0.5,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
});
