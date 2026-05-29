import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/layout/Screen";
import { AppText } from "@/components/ui/AppText";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { colors, radius, spacing } from "@/theme/tokens";
import { Icon } from "@/components/ui/Icon";
import { useProfile } from "@/stores/profile";
import { useAuth } from "@/contexts/AuthContext";
import { my } from "@/i18n/my";

export default function ProfileScreen() {
  const router = useRouter();
  const { businessName, ownerName } = useProfile();
  const { signOut } = useAuth();

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: spacing.md, marginBottom: spacing["4xl"] }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.bg.iconSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="profile" size={32} color={colors.accent.base} />
        </View>
        <AppText variant="subhead">{businessName || "—"}</AppText>
        {ownerName ? <AppText variant="caption" color="secondary">{ownerName}</AppText> : null}
      </View>

      <Eyebrow style={{ marginBottom: spacing.md }}>{my.profile.businessProfile}</Eyebrow>
      <Surface radius="goalCard" style={{ padding: spacing["2xl"], marginBottom: spacing.lg, gap: spacing.lg }}>
        <Row label={my.businessProfile.title} onPress={() => router.push("/business-profile")} />
        <Row label={my.profile.channels} />
        <Row label={my.profile.customers} />
        <Row label={my.profile.suppliers} />
      </Surface>

      <Eyebrow style={{ marginBottom: spacing.md }}>DATA</Eyebrow>
      <Surface radius="goalCard" style={{ padding: spacing["2xl"], marginBottom: spacing["4xl"], gap: spacing.lg }}>
        <Row label={my.importSales.title} onPress={() => router.push("/import-sales")} />
        <Row label={my.importProducts.title} onPress={() => router.push("/import-products")} />
      </Surface>

      <Button label={my.profile.signOut} variant="secondary" onPress={signOut} />
    </Screen>
  );
}

function Row({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
    >
      <AppText variant="bodyMedium">{label}</AppText>
      <Icon name="chevron-right" size={18} color={colors.text.tertiary} />
    </Pressable>
  );
}
