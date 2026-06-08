"use client";

import { useState } from "react";
import { View, Pressable, Alert } from "@/rn";
import { useRouter } from "@/rn/router";
import { FileSystem, Sharing } from "@/rn/expo";
import { Screen } from "@/components/layout/Screen";
import { AppText } from "@/components/ui/AppText";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { colors, spacing } from "@/theme/tokens";
import { Icon } from "@/components/ui/Icon";
import { useProfile } from "@/stores/profile";
import { useAuth } from "@/contexts/AuthContext";
import { exportMyData, deleteMyAccount } from "@/lib/api";
import { my } from "@/i18n/my";

export default function ProfileScreen() {
  const router = useRouter();
  const { businessName, ownerName, reset } = useProfile();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);

  const onExport = async () => {
    if (busy) return;
    setBusy("export");
    try {
      const json = await exportMyData();
      const date = new Date().toISOString().slice(0, 10);
      const dir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? "";
      const path = `${dir}strivo-export-${date}.json`;
      await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(path, {
          mimeType: "application/json",
          dialogTitle: my.account.exportTitle,
          UTI: "public.json",
        });
      } else {
        Alert.alert(my.account.exportSuccess, path);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : my.account.exportError;
      Alert.alert(my.account.exportError, msg);
    } finally {
      setBusy(null);
    }
  };

  const performDelete = async () => {
    setBusy("delete");
    try {
      await deleteMyAccount();
      reset();
      await signOut();
      router.replace("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : my.account.deleteError;
      Alert.alert(my.account.deleteError, msg);
      setBusy(null);
    }
  };

  const onDelete = () => {
    if (busy) return;
    Alert.alert(
      my.account.deleteConfirmTitle,
      my.account.deleteConfirmBody,
      [
        { text: my.account.deleteCancelCta, style: "cancel" },
        { text: my.account.deleteConfirmCta, style: "destructive", onPress: performDelete },
      ],
    );
  };

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
        {ownerName ? (
          <AppText variant="caption" color="secondary">
            {ownerName}
          </AppText>
        ) : null}
      </View>

      <Eyebrow style={{ marginBottom: spacing.md }}>{my.profile.businessProfile}</Eyebrow>
      <Surface radius="goalCard" style={{ padding: spacing["2xl"], marginBottom: spacing.lg, gap: spacing.lg }}>
        <Row label={my.businessProfile.title} onPress={() => router.push("/business-profile")} />
        <Row label={my.profile.customers} onPress={() => router.push("/business-profile")} />
        <Row label={my.profile.suppliers} onPress={() => router.push("/business-profile")} />
      </Surface>

      <Eyebrow style={{ marginBottom: spacing.md }}>DATA</Eyebrow>
      <Surface radius="goalCard" style={{ padding: spacing["2xl"], marginBottom: spacing.lg, gap: spacing.lg }}>
        <Row label={my.importSales.title} onPress={() => router.push("/import-sales")} />
        <Row label={my.importExpenses.title} onPress={() => router.push("/import-expenses")} />
        <Row label={my.importProducts.title} onPress={() => router.push("/import-products")} />
      </Surface>

      <Eyebrow style={{ marginBottom: spacing.md }}>{my.account.sectionLabel}</Eyebrow>
      <Surface radius="goalCard" style={{ padding: spacing["2xl"], marginBottom: spacing["4xl"], gap: spacing.lg }}>
        <Row
          label={busy === "export" ? my.account.exporting : my.account.exportTitle}
          subline={my.account.exportDescription}
          onPress={onExport}
          disabled={!!busy}
        />
        <Row
          label={busy === "delete" ? my.account.deleting : my.account.deleteTitle}
          subline={my.account.deleteDescription}
          onPress={onDelete}
          disabled={!!busy}
          danger
        />
      </Surface>

      <Button label={my.profile.signOut} variant="secondary" onPress={signOut} />
    </Screen>
  );
}

function Row({
  label,
  subline,
  onPress,
  disabled,
  danger,
}: {
  label: string;
  subline?: string;
  onPress?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
        (disabled || !onPress) && { opacity: 0.5 },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={{ flex: 1, marginRight: spacing.md }}>
        <AppText variant="bodyMedium" style={danger ? { color: colors.semantic.critical } : undefined}>
          {label}
        </AppText>
        {subline ? (
          <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
            {subline}
          </AppText>
        ) : null}
      </View>
      <Icon name="chevron-right" size={18} color={colors.text.tertiary} />
    </Pressable>
  );
}
