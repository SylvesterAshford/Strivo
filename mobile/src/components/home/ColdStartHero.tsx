import { Pressable, View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { colors, radius, spacing } from "@/theme/tokens";
import { my } from "@/i18n/my";

// design.md 6.1 — single pinned card on a fresh home: plum-peach gradient,
// centered mic icon, Burmese prompt. Tapping the card == tapping the dock mic.
export function ColdStartHero() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={my.coldStart.micHint}
      onPress={() => router.push("/record")}
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <LinearGradient
        colors={colors.gradient.plumPeach}
        locations={colors.gradient.plumPeachLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.iconRing}>
          <Icon name="mic" size={30} color={colors.accent.base} />
        </View>
        {/* Extra paddingTop offsets Myanmar ascenders that extend above the line box
            and would otherwise be clipped by the gradient's overflow:hidden boundary. */}
        <View style={{ paddingTop: 12 }}>
          <AppText variant="subhead" style={{ textAlign: "center", marginTop: spacing.lg }}>
            {my.coldStart.heroPrompt}
          </AppText>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.pinnedCard,
    paddingVertical: spacing["5xl"],
    paddingHorizontal: spacing["3xl"],
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
});
