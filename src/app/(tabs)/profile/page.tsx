"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { View, Pressable, Alert } from "@/rn";
import { useRouter } from "@/rn/router";
import { FileSystem, Sharing } from "@/rn/expo";
import { Screen } from "@/components/layout/Screen";
import { AppText } from "@/components/ui/AppText";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { colors, spacing, radius } from "@/theme/tokens";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useProfile } from "@/stores/profile";
import { useAuth } from "@/contexts/AuthContext";
import { exportMyData, deleteMyAccount, fetchProfile, saveProfile } from "@/lib/api";
import { my } from "@/i18n/my";

/** Resize an image file to a ≤256px JPEG data URL (~40KB) for in-DB storage. */
async function fileToAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const scale = 256 / side;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function ProfileScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { businessName, ownerName, reset } = useProfile();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState<"export" | "delete" | "avatar" | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile, staleTime: 60_000 });
  const avatarUrl = profile?.avatarUrl ?? null;

  const onPickAvatar = async (file: File) => {
    setBusy("avatar");
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      await saveProfile({ avatarUrl: dataUrl });
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (err) {
      Alert.alert(my.profile.photoError, err instanceof Error ? err.message : "");
    } finally {
      setBusy(null);
    }
  };

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
      {/* Identity header — tappable shop photo with a camera badge. */}
      <View style={{ alignItems: "center", gap: spacing.md, marginBottom: spacing["4xl"] }}>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onPickAvatar(file);
            e.target.value = "";
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={my.profile.changePhoto}
          onPress={() => !busy && avatarInputRef.current?.click()}
          style={({ pressed }) => [{ opacity: busy === "avatar" ? 0.5 : pressed ? 0.8 : 1 }]}
        >
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              backgroundColor: colors.bg.iconSoft,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              borderWidth: 1,
              borderColor: colors.border.default,
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <Icon name="store" size={34} color={colors.accent.base} />
            )}
          </View>
          {/* Camera badge — signals the photo is editable without a label. */}
          <View
            style={{
              position: "absolute",
              right: -2,
              bottom: -2,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: colors.bg.surface,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.border.default,
              boxShadow: "0 1px 4px rgba(15,23,42,0.12)",
            }}
          >
            <Icon name="camera" size={14} color={colors.text.secondary} />
          </View>
        </Pressable>
        <AppText variant="subhead">{businessName || "—"}</AppText>
        {ownerName ? (
          <AppText variant="caption" color="secondary">
            {ownerName}
          </AppText>
        ) : null}
      </View>

      {/* Single row — the business-profile page already edits customers and
          suppliers, so separate rows were duplicate links to the same screen. */}
      <Eyebrow style={{ marginBottom: spacing.md }}>{my.profile.businessProfile}</Eyebrow>
      <Surface radius="goalCard" style={{ padding: spacing["2xl"], marginBottom: spacing.lg, gap: spacing.lg }}>
        <Row icon="store" label={my.businessProfile.title} onPress={() => router.push("/business-profile")} />
      </Surface>

      <Eyebrow style={{ marginBottom: spacing.md }}>DATA</Eyebrow>
      <Surface radius="goalCard" style={{ padding: spacing["2xl"], marginBottom: spacing.lg, gap: spacing.lg }}>
        <Row icon="spreadsheet" label={my.importSales.title} onPress={() => router.push("/import-sales")} />
        <Row icon="tag" label={my.importExpenses.title} onPress={() => router.push("/import-expenses")} />
        <Row icon="package" label={my.importProducts.title} onPress={() => router.push("/import-products")} />
        <Row icon="clock" label={my.imports.title} onPress={() => router.push("/imports")} />
      </Surface>

      <Eyebrow style={{ marginBottom: spacing.md }}>{my.account.sectionLabel}</Eyebrow>
      <Surface radius="goalCard" style={{ padding: spacing["2xl"], marginBottom: spacing["4xl"], gap: spacing.lg }}>
        <Row
          icon="download"
          label={busy === "export" ? my.account.exporting : my.account.exportTitle}
          subline={my.account.exportDescription}
          onPress={onExport}
          disabled={!!busy}
        />
        <Row
          icon="trash"
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
  icon,
  label,
  subline,
  onPress,
  disabled,
  danger,
}: {
  icon: IconName;
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
        { flexDirection: "row", alignItems: "center" },
        (disabled || !onPress) && { opacity: 0.5 },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.iconContainer,
          backgroundColor: danger ? "rgba(185,28,28,0.08)" : colors.bg.elevated,
          alignItems: "center",
          justifyContent: "center",
          marginRight: spacing.md,
        }}
      >
        <Icon name={icon} size={17} color={danger ? colors.semantic.critical : colors.text.secondary} />
      </View>
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
