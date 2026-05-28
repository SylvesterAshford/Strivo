import { useState } from "react";
import { View, Pressable, StyleSheet, ScrollView } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { WizardStep } from "@/components/layout/WizardStep";
import { AppText } from "@/components/ui/AppText";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useOnboarding } from "@/stores/onboarding";
import { useProfile } from "@/stores/profile";
import { finishOnboarding } from "@/lib/finish-onboarding";
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

export default function BulkImportStep() {
  const draft = useOnboarding();
  const setBusinessName = useProfile((s) => s.setBusinessName);
  const setBusinessType = useProfile((s) => s.setBusinessType);
  const setHeroMetric = useProfile((s) => s.setHeroMetric);
  const completeOnboarding = useProfile((s) => s.completeOnboarding);
  const resetDraft = useOnboarding((s) => s.reset);

  const [mode, setMode] = useState<Mode>("initial");
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finishWizard = async (): Promise<void> => {
    await finishOnboarding(draft, {
      setBusinessName,
      setBusinessType,
      setHeroMetric,
      completeOnboarding,
    });
    resetDraft();
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
      await importSalesConfirm(preview.headers, preview.rows, mapping);
      await finishWizard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      setBusy(false);
    }
  };

  const onConfirmPaste = async () => {
    if (pasteText.trim().length < 10) return;
    setBusy(true);
    setError(null);
    try {
      await importSalesText(pasteText.trim());
      await finishWizard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
      setBusy(false);
    }
  };

  const onSkip = async () => {
    setBusy(true);
    setError(null);
    try {
      await finishWizard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setBusy(false);
    }
  };

  // ── Excel preview mode ────────────────────────────────────────────────
  if (mode === "excel" && preview && mapping) {
    return (
      <WizardStep
        step={11}
        totalSteps={11}
        title={my.onboarding.bulkConfirmTitle}
        subtitle={my.onboarding.bulkRows(preview.totalRows)}
        ctaLabel={busy ? my.onboarding.bulkImporting : my.onboarding.bulkImportAndFinish}
        onCta={onConfirmExcel}
        ctaDisabled={busy || mapping.amount < 0}
        secondaryLabel={my.onboarding.bulkSkipFinish}
        onSecondary={onSkip}
      >
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
          <View style={styles.sampleBox}>
            <Eyebrow style={{ marginBottom: spacing.sm }}>SAMPLE</Eyebrow>
            {preview.sampleRows.slice(0, 3).map((row, i) => (
              <AppText key={i} variant="caption" color="secondary" numberOfLines={1} style={{ marginBottom: 2 }}>
                {row.map((c) => (c == null ? "—" : String(c))).join(" · ")}
              </AppText>
            ))}
          </View>
          {error ? (
            <AppText variant="caption" style={{ color: colors.semantic.critical }}>
              {error}
            </AppText>
          ) : null}
        </View>
      </WizardStep>
    );
  }

  // ── Text paste mode ───────────────────────────────────────────────────
  if (mode === "paste") {
    return (
      <WizardStep
        step={11}
        totalSteps={11}
        title={my.onboarding.bulkPasteTitle}
        subtitle={my.onboarding.bulkPasteSubtitle}
        ctaLabel={busy ? my.onboarding.bulkImporting : my.onboarding.bulkImportAndFinish}
        onCta={onConfirmPaste}
        ctaDisabled={busy || pasteText.trim().length < 10}
        secondaryLabel={my.onboarding.bulkSkipFinish}
        onSecondary={onSkip}
      >
        <View style={{ gap: spacing.lg }}>
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
            <AppText variant="caption" style={{ color: colors.semantic.critical }}>
              {error}
            </AppText>
          ) : null}
        </View>
      </WizardStep>
    );
  }

  // ── Initial mode — three choices ──────────────────────────────────────
  return (
    <WizardStep
      step={11}
      totalSteps={11}
      title={my.onboarding.bulkTitle}
      subtitle={my.onboarding.bulkSubtitle}
      ctaLabel={busy ? my.onboarding.bulkSaving : my.onboarding.bulkSkipFinish}
      onCta={onSkip}
      ctaDisabled={busy}
    >
      <View style={{ gap: spacing.md }}>
        <Button
          label={busy ? my.onboarding.bulkAnalyzing : my.onboarding.bulkPick}
          onPress={onPickFile}
          disabled={busy}
        />
        <Button
          label={my.onboarding.bulkPasteCta}
          variant="secondary"
          onPress={() => setMode("paste")}
        />
        {error ? (
          <AppText variant="caption" style={{ color: colors.semantic.critical }}>
            {error}
          </AppText>
        ) : null}
      </View>
    </WizardStep>
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
      <AppText variant="caption" style={{ color: selected ? colors.accent.base : colors.text.primary }}>
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
    padding: spacing.md,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.attentionCard,
  },
});
