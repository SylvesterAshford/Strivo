import { Pressable, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { colors, radius, spacing } from "@/theme/tokens";
import { my } from "@/i18n/my";

export function ColdStartHero() {
  const router = useRouter();
  return (
    <View style={{ gap: spacing.lg }}>
      <Pressable
        onPress={() => router.push("/record")}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] }]}
      >
        <View style={styles.iconBox}>
          <Icon name="plus" size={22} color={colors.accent.base} />
        </View>
        <View style={{ flex: 1, marginLeft: spacing.lg }}>
          <AppText variant="title">{my.addData.title}</AppText>
          <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
            {my.addData.subtitle}
          </AppText>
        </View>
        <Icon name="chevron-right" size={18} color={colors.text.tertiary} />
      </Pressable>

      <Pressable
        onPress={() => router.push("/manual-entry")}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] }]}
      >
        <View style={[styles.iconBox, { backgroundColor: colors.bg.iconNeutral }]}>
          <Icon name="pencil" size={22} color={colors.text.secondary} />
        </View>
        <View style={{ flex: 1, marginLeft: spacing.lg }}>
          <AppText variant="title">{my.addData.manualTitle}</AppText>
          <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
            {my.addData.manualSubtitle}
          </AppText>
        </View>
        <Icon name="chevron-right" size={18} color={colors.text.tertiary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.surface,
    borderRadius: radius.pinnedCard,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.xl,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.iconContainer,
    backgroundColor: colors.accent.soft,
    alignItems: "center",
    justifyContent: "center",
  },
});
