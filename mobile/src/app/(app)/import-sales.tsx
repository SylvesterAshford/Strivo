import { useState } from "react";
import { View, Pressable, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { Screen } from "@/components/layout/Screen";
import { SubHeader } from "@/components/layout/SubHeader";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { TextField } from "@/components/ui/TextField";
import {
  importSalesPreview,
  importSalesConfirm,
  importSalesText,
  type ImportPreviewResponse,
  type ColumnMapping,
} from "@/lib/api";
import { colors, spacing, radius } from "@/theme/tokens";
import { my } from "@/i18n/my";

type Mode = "initial" | "excel" | "paste";

type RoleKey = keyof ColumnMapping;
const ROLES: { key: RoleKey; label: string }[] = [
  { key: "date", label: my.importSales.roleDate },
  { key: "customer", label: my.importSales.roleCustomer },
  { key: "amount", label: my.importSales.roleAmount },
  { key: "product", label: my.importSales.roleProduct },
  { key: "quantity", label: my.importSales.roleQuantity },
];

export default function ImportSalesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("initial");
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<number | null>(null);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["home"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
    qc.invalidateQueries({ queryKey: ["analytics"] });
    qc.invalidateQueries({ queryKey: ["insights"] });
  };

  const onPickFile = async () => {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({
      type: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setBusy(true);
    try {
      const data = await importSalesPreview(
        asset.uri,
        asset.name,
        asset.mimeType ?? "application/octet-stream"
      );
      setPreview(data);
      setMapping(data.mapping);
      setMode("excel");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  };

  const onConfirmExcel = async () => {
    if (!preview || !mapping) return;
    setBusy(true);
    setError(null);
    try {
      const r = await importSalesConfirm(preview.headers, preview.rows, mapping);
      setImported(r.inserted);
      invalidateAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const onConfirmPaste = async () => {
    if (pasteText.trim().length < 10) return;
    setBusy(true);
    setError(null);
    try {
      const r = await importSalesText(pasteText.trim());
      setImported(r.inserted);
      invalidateAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setBusy(false);
    }
  };

  // ── Success ───────────────────────────────────────────────────────────
  if (imported !== null) {
    return (
      <Screen>
        <SubHeader title={my.importSales.title} />
        <View style={styles.successBox}>
          <AppText variant="subhead">{my.importSales.imported(imported)}</AppText>
          <Button label={my.common.done} onPress={() => router.replace("/")} />
        </View>
      </Screen>
    );
  }

  // ── Excel preview / mapping ──────────────────────────────────────────
  if (mode === "excel" && preview && mapping) {
    return (
      <Screen>
        <SubHeader title={my.importSales.mappingTitle} />
        <AppText variant="body" color="secondary" style={{ marginBottom: spacing.md }}>
          {my.importSales.mappingSubtitle}
        </AppText>
        <AppText variant="caption" color="tertiary" style={{ marginBottom: spacing.lg }}>
          {my.importSales.rowsDetected(preview.totalRows)}
        </AppText>

        <View style={{ gap: spacing.lg }}>
          {ROLES.map((role) => (
            <RoleRow
              key={role.key}
              label={role.label}
              headers={preview.headers}
              selectedIdx={mapping[role.key]}
              onPick={(idx) => setMapping({ ...mapping, [role.key]: idx })}
            />
          ))}
        </View>

        <View style={styles.sampleBox}>
          <Eyebrow style={{ marginBottom: spacing.sm }}>SAMPLE</Eyebrow>
          {preview.sampleRows.slice(0, 3).map((row, i) => (
            <AppText key={i} variant="caption" color="secondary" numberOfLines={1} style={{ marginBottom: 2 }}>
              {row.map((c) => (c == null ? "—" : String(c))).join(" · ")}
            </AppText>
          ))}
        </View>

        {error ? (
          <AppText variant="caption" style={{ color: colors.semantic.critical, marginTop: spacing.md }}>
            {error}
          </AppText>
        ) : null}

        <View style={{ marginTop: spacing["2xl"], gap: spacing.md }}>
          <Button
            label={busy ? "..." : my.importSales.confirmImport}
            onPress={onConfirmExcel}
            disabled={busy || mapping.amount < 0}
          />
          <Button
            label={my.common.cancel}
            variant="secondary"
            onPress={() => {
              setPreview(null);
              setMapping(null);
              setMode("initial");
            }}
          />
        </View>
      </Screen>
    );
  }

  // ── Text paste ───────────────────────────────────────────────────────
  if (mode === "paste") {
    return (
      <Screen>
        <SubHeader title={my.onboarding.bulkPasteTitle} />
        <AppText variant="body" color="secondary" style={{ marginBottom: spacing.lg }}>
          {my.onboarding.bulkPasteSubtitle}
        </AppText>

        <TextField
          value={pasteText}
          onChangeText={setPasteText}
          placeholder={my.onboarding.bulkPastePlaceholder}
          multiline
          numberOfLines={10}
          autoFocus
          style={{ minHeight: 200, textAlignVertical: "top" }}
        />

        {error ? (
          <AppText variant="caption" style={{ color: colors.semantic.critical, marginTop: spacing.md }}>
            {error}
          </AppText>
        ) : null}

        <View style={{ marginTop: spacing["2xl"], gap: spacing.md }}>
          <Button
            label={busy ? my.onboarding.bulkImporting : my.onboarding.bulkImportAndFinish}
            onPress={onConfirmPaste}
            disabled={busy || pasteText.trim().length < 10}
          />
          <Button
            label={my.common.cancel}
            variant="secondary"
            onPress={() => {
              setPasteText("");
              setMode("initial");
            }}
          />
        </View>
      </Screen>
    );
  }

  // ── Initial ─────────────────────────────────────────────────────────
  return (
    <Screen>
      <SubHeader title={my.importSales.title} />
      <AppText variant="body" color="secondary" style={{ marginBottom: spacing["2xl"] }}>
        {my.importSales.subtitle}
      </AppText>

      <View style={{ gap: spacing.md }}>
        <Button
          label={busy ? my.importSales.analyzing : my.importSales.pickFile}
          onPress={onPickFile}
          disabled={busy}
        />
        <Button
          label={my.onboarding.bulkPasteCta}
          variant="secondary"
          onPress={() => setMode("paste")}
        />
      </View>

      {busy ? <ActivityIndicator color={colors.accent.base} style={{ marginTop: spacing.lg }} /> : null}
      {error ? (
        <AppText variant="caption" style={{ color: colors.semantic.critical, marginTop: spacing.md }}>
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}

function RoleRow({
  label,
  headers,
  selectedIdx,
  onPick,
}: {
  label: string;
  headers: string[];
  selectedIdx: number;
  onPick: (idx: number) => void;
}) {
  return (
    <View>
      <AppText variant="bodyMedium" style={{ marginBottom: spacing.sm }}>
        {label}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        <RoleChip label={my.importSales.roleNone} selected={selectedIdx === -1} onPress={() => onPick(-1)} />
        {headers.map((h, i) => (
          <RoleChip key={i} label={h || `Col ${i + 1}`} selected={selectedIdx === i} onPress={() => onPick(i)} />
        ))}
      </ScrollView>
    </View>
  );
}

function RoleChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        selected ? { backgroundColor: colors.accent.soft, borderColor: colors.accent.base } : null,
      ]}
    >
      <AppText
        variant="caption"
        style={{ color: selected ? colors.accent.base : colors.text.primary }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.iconContainer,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  sampleBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.attentionCard,
  },
  successBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing["2xl"],
    paddingHorizontal: spacing["3xl"],
  },
});
