import { useState } from "react";
import { View, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { Screen } from "@/components/layout/Screen";
import { SubHeader } from "@/components/layout/SubHeader";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Icon } from "@/components/ui/Icon";
import {
  importProductsFile,
  importProductsText,
  fetchProfile,
  saveProfile,
  type ProductSeed,
} from "@/lib/api";
import { colors, spacing, radius } from "@/theme/tokens";
import { my } from "@/i18n/my";

type Mode = "initial" | "paste" | "review";

const XLSX_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

export default function ImportProductsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("initial");
  const [text, setText] = useState("");
  const [products, setProducts] = useState<ProductSeed[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<number | null>(null);

  const pickFile = async (type: "xlsx" | "pdf") => {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({
      type: type === "xlsx" ? XLSX_TYPES : ["application/pdf"],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setBusy(true);
    try {
      const data = await importProductsFile(
        asset.uri,
        asset.name,
        asset.mimeType ?? (type === "pdf" ? "application/pdf" : XLSX_TYPES[0])
      );
      setProducts(data.products);
      setMode("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const onExtractText = async () => {
    setError(null);
    if (text.trim().length < 3) return;
    setBusy(true);
    try {
      const data = await importProductsText(text.trim());
      setProducts(data.products);
      setMode("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setBusy(false);
    }
  };

  const removeAt = (i: number) => setProducts((prev) => prev.filter((_, idx) => idx !== i));

  const onSave = async () => {
    setError(null);
    if (products.length === 0) return;
    setBusy(true);
    try {
      // Merge with existing seed so we don't overwrite previously saved items.
      const current = await fetchProfile();
      const existing = current?.productsSeed ?? [];
      const seen = new Set(existing.map((p) => p.name.trim().toLowerCase()));
      const merged = [...existing];
      for (const p of products) {
        const key = p.name.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(p);
        if (merged.length >= 50) break;
      }
      await saveProfile({ productsSeed: merged });
      setSaved(products.length);
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["insights"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  // ── Success ───────────────────────────────────────────────────────────
  if (saved !== null) {
    return (
      <Screen>
        <SubHeader title={my.importProducts.title} />
        <View style={styles.successBox}>
          <AppText variant="subhead">{my.importProducts.saved(saved)}</AppText>
          <Button label={my.common.done} onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  // ── Review extracted list ─────────────────────────────────────────────
  if (mode === "review") {
    return (
      <Screen>
        <SubHeader title={my.importProducts.reviewTitle} />
        <AppText variant="body" color="secondary" style={{ marginBottom: spacing.lg }}>
          {my.importProducts.reviewSubtitle}
        </AppText>

        {products.length === 0 ? (
          <AppText variant="caption" color="tertiary">
            {my.importProducts.none}
          </AppText>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {products.map((p, i) => (
              <View key={`${p.name}-${i}`} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyMedium">{p.name}</AppText>
                  {p.priceMmk !== undefined ? (
                    <AppText variant="caption" color="secondary">
                      {p.priceMmk.toLocaleString()} MMK
                    </AppText>
                  ) : null}
                </View>
                <Pressable onPress={() => removeAt(i)} hitSlop={12}>
                  <Icon name="x" size={18} color={colors.text.tertiary} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {error ? (
          <AppText variant="caption" style={{ color: colors.semantic.critical, marginTop: spacing.md }}>
            {error}
          </AppText>
        ) : null}

        <View style={{ marginTop: spacing["2xl"], gap: spacing.md }}>
          <Button
            label={busy ? "..." : my.importProducts.save}
            onPress={onSave}
            disabled={busy || products.length === 0}
          />
          <Button
            label={my.common.cancel}
            variant="secondary"
            onPress={() => {
              setProducts([]);
              setText("");
              setMode("initial");
            }}
          />
        </View>
      </Screen>
    );
  }

  // ── Paste text ────────────────────────────────────────────────────────
  if (mode === "paste") {
    return (
      <Screen>
        <SubHeader title={my.importProducts.pasteTitle} />
        <TextField
          value={text}
          onChangeText={setText}
          placeholder={my.importProducts.pastePlaceholder}
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
            label={busy ? my.importProducts.analyzing : my.common.next}
            onPress={onExtractText}
            disabled={busy || text.trim().length < 3}
          />
          <Button
            label={my.common.cancel}
            variant="secondary"
            onPress={() => {
              setText("");
              setMode("initial");
            }}
          />
        </View>
      </Screen>
    );
  }

  // ── Initial — 3 input options ─────────────────────────────────────────
  return (
    <Screen>
      <SubHeader title={my.importProducts.title} />
      <AppText variant="body" color="secondary" style={{ marginBottom: spacing["2xl"] }}>
        {my.importProducts.subtitle}
      </AppText>

      <View style={{ gap: spacing.md }}>
        <Button
          label={busy ? my.importProducts.analyzing : my.importProducts.pickExcel}
          onPress={() => pickFile("xlsx")}
          disabled={busy}
        />
        <Button
          label={my.importProducts.pickPdf}
          variant="secondary"
          onPress={() => pickFile("pdf")}
          disabled={busy}
        />
        <Button
          label={my.importProducts.pasteText}
          variant="secondary"
          onPress={() => setMode("paste")}
          disabled={busy}
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

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.surface,
    borderRadius: radius.attentionCard,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: spacing.md,
  },
  successBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing["2xl"],
    paddingHorizontal: spacing["3xl"],
  },
});
