"use client";

import { useState, type ReactNode } from "react";
import { View, ScrollView, Pressable, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, useSafeAreaInsets } from "@/rn";
import { useRouter } from "@/rn/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppText } from "@/components/ui/AppText";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { colors, spacing, radius } from "@/theme/tokens";
import { my } from "@/i18n/my";
import { fetchProfile, saveProfile, type BusinessProfile, type ProductSeed, type SupplierSeed, type ExpenseSeed } from "@/lib/api";
import { useProfile, type BusinessType } from "@/stores/profile";

// Coerce the backend's free-form businessType string into the local enum so
// the Home greeting / hero metric pick up edits immediately.
function toBusinessType(raw: string | null): BusinessType | null {
  switch (raw) {
    case "retail":
    case "fnb":
    case "services":
    case "b2b_trading":
    case "other":
      return raw;
    default:
      return raw ? "other" : null;
  }
}

const TYPES: { value: string; label: string }[] = [
  { value: "retail", label: my.businessType.retail },
  { value: "fnb", label: my.businessType.fnb },
  { value: "services", label: my.businessType.services },
  { value: "b2b_trading", label: my.businessType.b2bTrading },
  { value: "other", label: my.businessType.other },
];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Eyebrow>{label}</Eyebrow>
      {children}
    </View>
  );
}

function numToStr(n: number | null): string {
  return n != null && n > 0 ? String(n) : "";
}

function strToNum(s: string): number | null {
  const n = parseInt(s.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

// ── List-field parse/format (one item per line, "name : value" optional) ──────

function listToText(items: string[]): string {
  return items.join("\n");
}
function textToList(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
}

function productsToText(items: ProductSeed[]): string {
  return items.map((p) => (p.priceMmk ? `${p.name} : ${p.priceMmk}` : p.name)).join("\n");
}
function textToProducts(text: string): ProductSeed[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, rawPrice] = line.split(":").map((s) => s?.trim() ?? "");
      const price = parseInt((rawPrice ?? "").replace(/[^0-9]/g, ""), 10);
      return name ? { name: name.slice(0, 80), ...(Number.isFinite(price) && price > 0 ? { priceMmk: price } : {}) } : null;
    })
    .filter((x): x is ProductSeed => x !== null)
    .slice(0, 50);
}

function suppliersToText(items: SupplierSeed[]): string {
  return items.map((s) => (s.supplies ? `${s.name} : ${s.supplies}` : s.name)).join("\n");
}
function textToSuppliers(text: string): SupplierSeed[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, supplies] = line.split(":").map((s) => s?.trim() ?? "");
      return name ? { name: name.slice(0, 80), ...(supplies ? { supplies: supplies.slice(0, 120) } : {}) } : null;
    })
    .filter((x): x is SupplierSeed => x !== null)
    .slice(0, 30);
}

function expensesToText(items: ExpenseSeed[]): string {
  return items.map((e) => (e.monthlyMmk ? `${e.category} : ${e.monthlyMmk}` : e.category)).join("\n");
}
function textToExpenses(text: string): ExpenseSeed[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [category, rawAmount] = line.split(":").map((s) => s?.trim() ?? "");
      const amount = parseInt((rawAmount ?? "").replace(/[^0-9]/g, ""), 10);
      return category ? { category: category.slice(0, 40), ...(Number.isFinite(amount) && amount > 0 ? { monthlyMmk: amount } : {}) } : null;
    })
    .filter((x): x is ExpenseSeed => x !== null)
    .slice(0, 20);
}

export default function BusinessProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
    staleTime: 60_000,
  });

  // The form is the fetched profile with any in-progress edits layered on top.
  // Deriving it (rather than syncing via an effect) keeps the query as the
  // source of truth until the user touches a field.
  const [edited, setEdited] = useState<BusinessProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const form = edited ?? data ?? null;

  const set = <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) => {
    if (!form) return;
    setEdited({ ...form, [key]: value });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await saveProfile(form);

      // Mirror the edited fields into the local store so the Home greeting,
      // header, and hero metric reflect the change without a reload.
      const profileStore = useProfile.getState();
      profileStore.setBusinessName(form.businessName);
      const bt = toBusinessType(form.businessType);
      if (bt) profileStore.setBusinessType(bt);

      // Seed the query cache with the just-saved form so any mounted reader
      // updates instantly, then invalidate dependent queries.
      queryClient.setQueryData(["profile"], form);
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["insights"] });
      await queryClient.invalidateQueries({ queryKey: ["home"] });
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !form) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + spacing.lg, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.accent.base} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.root, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Icon name="arrow-left" size={22} color={colors.text.primary} />
          </Pressable>
          <AppText variant="title">{my.businessProfile.title}</AppText>
        </View>

        <ScrollView style={styles.scrollOuter} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AppText variant="caption" color="secondary" style={{ marginBottom: spacing["2xl"] }}>
            {my.businessProfile.subtitle}
          </AppText>

          <View style={{ gap: spacing.xl }}>
            <Field label={my.businessProfile.nameLabel}>
              <TextInput value={form.businessName} onChangeText={(t) => set("businessName", t)} style={styles.input} placeholderTextColor={colors.text.tertiary} />
            </Field>

            <Field label={my.businessProfile.typeLabel}>
              <View style={styles.pillRow}>
                {TYPES.map((t) => {
                  const active = form.businessType === t.value;
                  return (
                    <Pressable key={t.value} onPress={() => set("businessType", t.value)} style={[styles.pill, active && styles.pillActive]}>
                      <AppText variant="caption" color={active ? "onDark" : "secondary"}>
                        {t.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </Field>

            <Field label={my.businessProfile.productLabel}>
              <TextInput
                value={form.productService ?? ""}
                onChangeText={(t) => set("productService", t || null)}
                placeholder={my.businessProfile.productPlaceholder}
                style={styles.input}
                placeholderTextColor={colors.text.tertiary}
              />
            </Field>

            <Field label={my.businessProfile.locationLabel}>
              <TextInput
                value={form.location ?? ""}
                onChangeText={(t) => set("location", t || null)}
                placeholder={my.businessProfile.locationPlaceholder}
                style={styles.input}
                placeholderTextColor={colors.text.tertiary}
              />
            </Field>

            <Field label={my.businessProfile.targetLabel}>
              <TextInput
                value={numToStr(form.monthlyTargetMmk)}
                onChangeText={(t) => set("monthlyTargetMmk", strToNum(t))}
                placeholder={my.businessProfile.targetPlaceholder}
                keyboardType="numeric"
                style={styles.input}
                placeholderTextColor={colors.text.tertiary}
              />
            </Field>

            <Field label={my.businessProfile.challengeLabel}>
              <TextInput
                value={form.biggestChallenge ?? ""}
                onChangeText={(t) => set("biggestChallenge", t || null)}
                placeholder={my.businessProfile.challengePlaceholder}
                style={[styles.input, { minHeight: 64 }]}
                multiline
                placeholderTextColor={colors.text.tertiary}
              />
            </Field>

            <Field label={my.businessProfile.budgetLabel}>
              <TextInput
                value={numToStr(form.budgetMmk)}
                onChangeText={(t) => set("budgetMmk", strToNum(t))}
                placeholder={my.businessProfile.budgetPlaceholder}
                keyboardType="numeric"
                style={styles.input}
                placeholderTextColor={colors.text.tertiary}
              />
            </Field>

            <Field label={my.businessProfile.competitorsLabel}>
              <TextInput
                value={form.competitors.join(", ")}
                onChangeText={(t) => set("competitors", t.split(",").map((s) => s.trim()).filter(Boolean))}
                placeholder={my.businessProfile.competitorsPlaceholder}
                style={styles.input}
                placeholderTextColor={colors.text.tertiary}
              />
            </Field>

            <Field label={my.businessProfile.customersLabel}>
              <TextInput
                value={listToText(form.customersSeed)}
                onChangeText={(t) => set("customersSeed", textToList(t))}
                placeholder={my.businessProfile.customersPlaceholder}
                style={[styles.input, { minHeight: 96, textAlignVertical: "top" }]}
                multiline
                placeholderTextColor={colors.text.tertiary}
              />
            </Field>

            <Field label={my.businessProfile.suppliersLabel}>
              <TextInput
                value={suppliersToText(form.suppliersSeed)}
                onChangeText={(t) => set("suppliersSeed", textToSuppliers(t))}
                placeholder={my.businessProfile.suppliersPlaceholder}
                style={[styles.input, { minHeight: 96, textAlignVertical: "top" }]}
                multiline
                placeholderTextColor={colors.text.tertiary}
              />
            </Field>

            <Field label={my.businessProfile.productsLabel}>
              <TextInput
                value={productsToText(form.productsSeed)}
                onChangeText={(t) => set("productsSeed", textToProducts(t))}
                placeholder={my.businessProfile.productsPlaceholder}
                style={[styles.input, { minHeight: 96, textAlignVertical: "top" }]}
                multiline
                placeholderTextColor={colors.text.tertiary}
              />
            </Field>

            <Field label={my.businessProfile.expenseCategoriesLabel}>
              <TextInput
                value={expensesToText(form.expensesSeed)}
                onChangeText={(t) => set("expensesSeed", textToExpenses(t))}
                placeholder={my.businessProfile.expenseCategoriesPlaceholder}
                style={[styles.input, { minHeight: 96, textAlignVertical: "top" }]}
                multiline
                placeholderTextColor={colors.text.tertiary}
              />
            </Field>
          </View>

          <View style={{ height: spacing["5xl"] }} />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Pressable
            onPress={() => void handleSave()}
            disabled={saving}
            style={({ pressed }) => [styles.saveBtn, { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: saving ? 0.6 : 1 }]}
          >
            {saving ? (
              <ActivityIndicator color={colors.text.onDark} />
            ) : (
              <AppText variant="bodyMedium" color="onDark">
                {saved ? my.businessProfile.saved : my.common.save}
              </AppText>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: "100dvh", backgroundColor: colors.bg.base, alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    width: "100%",
    maxWidth: 760,
    paddingHorizontal: spacing.sectionX,
    paddingBottom: spacing.lg,
  },
  scrollOuter: { width: "100%", maxWidth: 760 },
  scroll: { paddingHorizontal: spacing.sectionX },
  input: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.attentionCard,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: "Inter",
    fontSize: 14,
    color: colors.text.primary,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
    alignSelf: "flex-start",
  },
  pillActive: {
    backgroundColor: colors.accent.base,
    borderColor: colors.accent.base,
  },
  footer: {
    width: "100%",
    maxWidth: 760,
    paddingHorizontal: spacing.sectionX,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.bg.base,
  },
  saveBtn: {
    paddingVertical: spacing.lg,
    alignItems: "center",
    borderRadius: radius.attentionCard,
    backgroundColor: colors.accent.base,
  },
});
