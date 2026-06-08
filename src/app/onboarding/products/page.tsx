"use client";

import { useState } from "react";
import { View, Pressable, StyleSheet, ActivityIndicator } from "@/rn";
import { useRouter } from "@/rn/router";
import { DocumentPicker } from "@/rn/expo";
import { WizardStep } from "@/components/layout/WizardStep";
import { TextField } from "@/components/ui/TextField";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { useOnboarding } from "@/stores/onboarding";
import { importProductsFile, type ProductSeed } from "@/lib/api";
import { colors, spacing, radius } from "@/theme/tokens";
import { my } from "@/i18n/my";

const BURMESE_DIGITS: Record<string, string> = {
  "၀": "0", "၁": "1", "၂": "2", "၃": "3", "၄": "4",
  "၅": "5", "၆": "6", "၇": "7", "၈": "8", "၉": "9",
};
function toAsciiDigits(s: string): string {
  return s.replace(/[၀-၉]/g, (d) => BURMESE_DIGITS[d] ?? d);
}

function parseProducts(s: string): ProductSeed[] {
  return s
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 50)
    .map((line) => {
      const [rawName, rawPrice] = line.split(":").map((x) => x.trim());
      const name = rawName ?? "";
      if (!name) return null;
      const priceNum = rawPrice ? parseInt(toAsciiDigits(rawPrice).replace(/[^0-9]/g, ""), 10) : NaN;
      return Number.isFinite(priceNum) && priceNum >= 0 ? { name, priceMmk: priceNum } : { name };
    })
    .filter((x): x is ProductSeed => x !== null);
}

function productsToText(products: ProductSeed[]): string {
  return products.map((p) => (p.priceMmk !== undefined ? `${p.name} : ${p.priceMmk}` : p.name)).join("\n");
}

const XLSX_TYPES = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"];

export default function ProductsStep() {
  const router = useRouter();
  const draft = useOnboarding();
  const [text, setText] = useState(productsToText(draft.productsSeed));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const advance = (products: ProductSeed[]) => {
    draft.patch({ productsSeed: products });
    router.push("/onboarding/suppliers");
  };

  const pickFile = async (kind: "xlsx" | "pdf") => {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({
      type: kind === "xlsx" ? XLSX_TYPES : ["application/pdf"],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setBusy(true);
    try {
      const data = await importProductsFile(asset.uri, asset.name, asset.mimeType ?? (kind === "pdf" ? "application/pdf" : XLSX_TYPES[0]));
      // Merge with whatever the user has typed so far so we don't trash edits.
      const existing = parseProducts(text);
      const seen = new Set(existing.map((p) => p.name.trim().toLowerCase()));
      const merged = [...existing];
      for (const p of data.products) {
        const key = p.name.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(p);
        if (merged.length >= 50) break;
      }
      setText(productsToText(merged));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <WizardStep
      step={8}
      totalSteps={10}
      title={my.onboarding.productsTitle}
      subtitle={my.onboarding.productsSubtitle}
      ctaLabel={my.common.next}
      onCta={() => advance(parseProducts(text))}
      ctaDisabled={busy || text.trim().length === 0}
      secondaryLabel={my.onboarding.skipLabel}
      onSecondary={() => advance([])}
    >
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <FileChip label={my.importProducts.pickExcel} disabled={busy} onPress={() => pickFile("xlsx")} />
          <FileChip label={my.importProducts.pickPdf} disabled={busy} onPress={() => pickFile("pdf")} />
        </View>

        {busy ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <ActivityIndicator color={colors.accent.base} size="small" />
            <AppText variant="caption" color="secondary">
              {my.importProducts.analyzing}
            </AppText>
          </View>
        ) : null}

        <TextField
          value={text}
          onChangeText={setText}
          placeholder={my.onboarding.productsPlaceholder}
          multiline
          numberOfLines={6}
          style={{ minHeight: 140, textAlignVertical: "top" }}
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

function FileChip({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }, disabled && { opacity: 0.5 }]}>
      <Icon name="square" size={14} color={colors.accent.base} />
      <AppText variant="caption" style={{ color: colors.accent.base, marginLeft: spacing.xs }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.attentionCard,
    borderWidth: 1,
    borderColor: colors.accent.base,
    backgroundColor: colors.accent.soft,
  },
});
