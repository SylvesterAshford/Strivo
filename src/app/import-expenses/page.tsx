"use client";

import { useState } from "react";
import { View, StyleSheet } from "@/rn";
import { useRouter } from "@/rn/router";
import { useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/layout/Screen";
import { ImportDropzone } from "@/components/import/ImportDropzone";
import { SubHeader } from "@/components/layout/SubHeader";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { TextField } from "@/components/ui/TextField";
import { RoleRow } from "@/components/import/RoleMapper";
import { importExpensesPreview, importExpensesConfirm, importExpensesText, type ExpenseImportPreviewResponse, type ExpenseColumnMapping } from "@/lib/api";
import { colors, spacing, radius } from "@/theme/tokens";
import { my } from "@/i18n/my";

type Mode = "initial" | "excel" | "paste";

type RoleKey = keyof ExpenseColumnMapping;
const ROLES: { key: RoleKey; label: string }[] = [
  { key: "date", label: my.importExpenses.roleDate },
  { key: "amount", label: my.importExpenses.roleAmount },
  { key: "category", label: my.importExpenses.roleCategory },
  { key: "description", label: my.importExpenses.roleDescription },
  { key: "counterparty", label: my.importExpenses.roleCounterparty },
];

export default function ImportExpensesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("initial");
  const [preview, setPreview] = useState<ExpenseImportPreviewResponse | null>(null);
  const [mapping, setMapping] = useState<ExpenseColumnMapping | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<number | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["home"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
    qc.invalidateQueries({ queryKey: ["analytics"] });
    qc.invalidateQueries({ queryKey: ["insights"] });
  };

  const onFile = async (asset: { uri: string; name: string; mimeType: string }) => {
    setError(null);
    setBusy(true);
    try {
      const data = await importExpensesPreview(asset.uri, asset.name, asset.mimeType);
      setPreview(data);
      setMapping(data.mapping);
      setFileName(asset.name);
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
      const r = await importExpensesConfirm(preview.headers, preview.rows, mapping, fileName ?? undefined);
      setImported(r.inserted);
      setSkipped(r.skipped);
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
      const r = await importExpensesText(pasteText.trim());
      setImported(r.inserted);
      invalidateAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setBusy(false);
    }
  };

  if (imported !== null) {
    return (
      <Screen>
        <SubHeader title={my.importExpenses.title} />
        <View style={styles.successBox}>
          <AppText variant="subhead">{my.importExpenses.imported(imported)}</AppText>
          {skipped > 0 ? (
            <AppText variant="body" color="secondary">
              {my.imports.skipped(skipped)}
            </AppText>
          ) : null}
          <Button label={my.common.done} onPress={() => router.replace("/")} />
        </View>
      </Screen>
    );
  }

  if (mode === "excel" && preview && mapping) {
    return (
      <Screen>
        <SubHeader title={my.importExpenses.mappingTitle} />
        <AppText variant="body" color="secondary" style={{ marginBottom: spacing.md }}>
          {my.importExpenses.mappingSubtitle}
        </AppText>
        <AppText variant="caption" color="tertiary" style={{ marginBottom: spacing.lg }}>
          {my.importExpenses.rowsDetected(preview.totalRows)}
        </AppText>

        <View style={{ gap: spacing.lg }}>
          {ROLES.map((role) => (
            <RoleRow
              key={role.key}
              label={role.label}
              noneLabel={my.importExpenses.roleNone}
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
          <Button label={busy ? "..." : my.importExpenses.confirmImport} onPress={onConfirmExcel} disabled={busy || mapping.amount < 0} />
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

  if (mode === "paste") {
    return (
      <Screen>
        <SubHeader title={my.importExpenses.pasteTitle} />
        <AppText variant="body" color="secondary" style={{ marginBottom: spacing.lg }}>
          {my.importExpenses.pasteSubtitle}
        </AppText>

        <TextField
          value={pasteText}
          onChangeText={setPasteText}
          placeholder={my.importExpenses.pastePlaceholder}
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
          <Button label={busy ? my.importExpenses.analyzing : my.importExpenses.importAndFinish} onPress={onConfirmPaste} disabled={busy || pasteText.trim().length < 10} />
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

  return (
    <Screen>
      <SubHeader title={my.importExpenses.title} />
      <View style={{ width: "100%", alignItems: "center" }}>
      <View style={{ maxWidth: 560, width: "100%" }}>
        <AppText variant="body" color="secondary" style={{ marginBottom: spacing.xl }}>
          {my.importExpenses.subtitle}
        </AppText>

        <ImportDropzone onFile={onFile} busy={busy} />

        <View
          style={{
            marginTop: spacing.xl,
            paddingTop: spacing.lg,
            borderTopWidth: 1,
            borderTopColor: colors.border.hairline,
          }}
        >
          <Button label={my.importExpenses.pasteCta} variant="secondary" onPress={() => setMode("paste")} disabled={busy} />
        </View>

        {error ? (
          <AppText variant="caption" style={{ color: colors.semantic.critical, marginTop: spacing.md }}>
            {error}
          </AppText>
        ) : null}
      </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    gap: spacing.lg,
  },
});
