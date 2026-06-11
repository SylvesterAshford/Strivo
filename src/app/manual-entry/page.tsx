"use client";

import { useState } from "react";
import { View, ScrollView, Pressable, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, useSafeAreaInsets } from "@/rn";
import { useRouter } from "@/rn/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppText } from "@/components/ui/AppText";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { colors, spacing, radius } from "@/theme/tokens";
import { my } from "@/i18n/my";
import { confirmFacts, fetchProfile, type DraftFact } from "@/lib/api";

type Kind = DraftFact["kind"];

const KINDS: { kind: Kind; label: string; color: string }[] = [
  { kind: "sale", label: "ရောင်းအား", color: colors.semantic.positive },
  { kind: "expense", label: "ကုန်ကျ", color: colors.semantic.caution },
  { kind: "receivable", label: "ရရန်ကျန်", color: colors.accent.base },
  { kind: "note", label: "မှတ်ချက်", color: colors.text.secondary },
];

const AMOUNT_KINDS: Kind[] = ["sale", "expense", "receivable"];

export default function ManualEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [kind, setKind] = useState<Kind>("sale");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pull onboarding expense categories so the user can quick-pick instead of
  // retyping. Cached for the whole session — these change rarely.
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
    staleTime: 5 * 60_000,
  });
  const expenseCategories = profile?.expensesSeed ?? [];

  const showAmount = AMOUNT_KINDS.includes(kind);
  const showCategory = kind === "expense";
  const canSave = description.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const amountMmk = showAmount && amount.trim() ? parseInt(amount.replace(/[^0-9]/g, ""), 10) || undefined : undefined;

      const fact: DraftFact = {
        kind,
        description: description.trim(),
        amountMmk,
        counterparty: counterparty.trim() || undefined,
        category: showCategory && category.trim() ? category.trim() : undefined,
      };

      await confirmFacts([fact]);
      await queryClient.invalidateQueries({ queryKey: ["home"] });
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      router.replace("/");
    } catch {
      setError("သိမ်းမရပါ၊ ထပ်ကြိုးစားပါ");
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.root, { paddingTop: insets.top + spacing.lg }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Icon name="arrow-left" size={22} color={colors.text.primary} />
          </Pressable>
          <AppText variant="title">{my.manualEntry.title}</AppText>
        </View>

        <ScrollView style={styles.scrollOuter} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Kind picker */}
          <Eyebrow style={{ marginBottom: spacing.md }}>{my.manualEntry.kindLabel}</Eyebrow>
          <View style={styles.kindRow}>
            {KINDS.map((k) => {
              const active = kind === k.kind;
              return (
                <Pressable key={k.kind} onPress={() => setKind(k.kind)} style={[styles.kindPill, active && { backgroundColor: k.color, borderColor: k.color }]}>
                  <AppText variant="caption" style={{ color: active ? "#fff" : colors.text.secondary }}>
                    {k.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {/* Description */}
          <Eyebrow style={{ marginTop: spacing["3xl"], marginBottom: spacing.sm }}>{my.manualEntry.descLabel}</Eyebrow>
          <View style={styles.inputBox}>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={my.manualEntry.descPlaceholder}
              placeholderTextColor={colors.text.tertiary}
              style={styles.input}
              multiline
              autoFocus
            />
          </View>

          {/* Amount */}
          {showAmount && (
            <>
              <Eyebrow style={{ marginTop: spacing["2xl"], marginBottom: spacing.sm }}>{my.manualEntry.amountLabel}</Eyebrow>
              <View style={styles.inputBox}>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder={my.manualEntry.amountPlaceholder}
                  placeholderTextColor={colors.text.tertiary}
                  style={styles.input}
                  keyboardType="numeric"
                />
              </View>
            </>
          )}

          {/* Category (expense only) */}
          {showCategory && (
            <>
              <Eyebrow style={{ marginTop: spacing["2xl"], marginBottom: spacing.sm }}>{my.manualEntry.categoryLabel}</Eyebrow>
              {expenseCategories.length > 0 ? (
                <View style={[styles.kindRow, { marginBottom: spacing.sm }]}>
                  {expenseCategories.map((c) => {
                    const active = category === c.category;
                    return (
                      <Pressable
                        key={c.category}
                        onPress={() => setCategory(c.category)}
                        style={[styles.kindPill, active && { backgroundColor: colors.accent.base, borderColor: colors.accent.base }]}
                      >
                        <AppText variant="caption" style={{ color: active ? "#fff" : colors.text.secondary }}>
                          {c.category}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
              <View style={styles.inputBox}>
                <TextInput
                  value={category}
                  onChangeText={setCategory}
                  placeholder={my.manualEntry.categoryPlaceholder}
                  placeholderTextColor={colors.text.tertiary}
                  style={styles.input}
                />
              </View>
            </>
          )}

          {/* Counterparty */}
          <Eyebrow style={{ marginTop: spacing["2xl"], marginBottom: spacing.sm }}>{my.manualEntry.counterpartyLabel}</Eyebrow>
          <View style={styles.inputBox}>
            <TextInput
              value={counterparty}
              onChangeText={setCounterparty}
              placeholder={my.manualEntry.counterpartyPlaceholder}
              placeholderTextColor={colors.text.tertiary}
              style={styles.input}
            />
          </View>

          {error ? (
            <AppText variant="caption" color="secondary" style={{ marginTop: spacing.lg, textAlign: "center" }}>
              {error}
            </AppText>
          ) : null}

          <View style={{ height: spacing["5xl"] }} />
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Pressable onPress={() => router.back()} style={styles.cancelBtn}>
            <AppText variant="body" color="secondary">
              {my.common.cancel}
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => void handleSave()}
            disabled={saving || !canSave}
            style={({ pressed }) => [styles.saveBtn, { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: saving || !canSave ? 0.5 : 1 }]}
          >
            {saving ? <ActivityIndicator color={colors.text.onDark} /> : <AppText variant="bodyMedium" color="onDark">{my.common.save}</AppText>}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: "100dvh",
    backgroundColor: colors.bg.base,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    width: "100%",
    maxWidth: 760,
    paddingHorizontal: spacing.sectionX,
    paddingBottom: spacing.lg,
  },
  scrollOuter: {
    width: "100%",
    maxWidth: 760,
  },
  scroll: {
    paddingHorizontal: spacing.sectionX,
  },
  kindRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  kindPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
    alignSelf: "flex-start",
  },
  inputBox: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.attentionCard,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
    justifyContent: "center",
  },
  input: {
    fontFamily: "Inter",
    fontSize: 13,
    color: colors.text.primary,
    minHeight: 24,
  },
  footer: {
    flexDirection: "row",
    width: "100%",
    maxWidth: 760,
    paddingHorizontal: spacing.sectionX,
    paddingTop: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.bg.base,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.lg,
    alignItems: "center",
    borderRadius: radius.attentionCard,
    backgroundColor: colors.bg.elevated,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: spacing.lg,
    alignItems: "center",
    borderRadius: radius.attentionCard,
    backgroundColor: colors.accent.base,
  },
});
