import { Pressable, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { fetchProfile, type BusinessProfile } from "@/lib/api";
import { colors, spacing, radius } from "@/theme/tokens";
import { my } from "@/i18n/my";

// Show the banner when any meaningful AI-context field is missing. Fields
// that don't materially shape insights (e.g. heroMetric) are excluded.
function incomplete(p: BusinessProfile): boolean {
  return (
    !p.productService ||
    !p.businessType ||
    p.posEnabled === null ||
    p.salesPeriods.length === 0 ||
    Object.keys(p.salesValues).length === 0 ||
    p.monthlyExpensesMmk === null ||
    p.competitors.length === 0 ||
    p.customersSeed.length === 0 ||
    p.productsSeed.length === 0 ||
    p.suppliersSeed.length === 0
  );
}

export function ProfileNudge() {
  const router = useRouter();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
    staleTime: 5 * 60_000,
  });

  // Three states:
  // 1. Still loading first fetch → don't render yet.
  // 2. Backend returned a *complete* profile → hide the nudge.
  // 3. Anything else (incomplete profile OR fetch returned null) → show.
  if (isLoading) return null;
  if (profile && !incomplete(profile)) return null;

  return (
    <Pressable
      onPress={() => router.push("/business-profile")}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.iconBox}>
        <Icon name="sparkles" size={16} color={colors.accent.base} />
      </View>
      <View style={{ flex: 1, marginHorizontal: spacing.md }}>
        <AppText variant="bodyMedium" color="primary">
          {my.onboarding.nudgeIncomplete}
        </AppText>
        <AppText variant="caption" color="accent" style={{ marginTop: 2 }}>
          {my.onboarding.nudgeCta}
        </AppText>
      </View>
      <Icon name="chevron-right" size={18} color={colors.text.tertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.iconSoft,
    borderRadius: radius.attentionCard,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.iconContainer,
    backgroundColor: colors.bg.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
