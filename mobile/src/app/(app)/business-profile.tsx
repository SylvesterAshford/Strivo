import { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppText } from "@/components/ui/AppText";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { colors, spacing, radius } from "@/theme/tokens";
import { my } from "@/i18n/my";
import { fetchProfile, saveProfile, type BusinessProfile } from "@/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TYPES: { value: string; label: string }[] = [
  { value: "retail", label: my.businessType.retail },
  { value: "fnb", label: my.businessType.fnb },
  { value: "services", label: my.businessType.services },
  { value: "b2b_trading", label: my.businessType.b2bTrading },
  { value: "other", label: my.businessType.other },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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

export default function BusinessProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
    staleTime: 60_000,
  });

  const [form, setForm] = useState<BusinessProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  const set = <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await saveProfile(form);
      // Profile feeds the AI insights — invalidate so the next visit regenerates.
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["insights"] });
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
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Icon name="arrow-left" size={22} color={colors.text.primary} />
          </Pressable>
          <AppText variant="title">{my.businessProfile.title}</AppText>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppText variant="caption" color="secondary" style={{ marginBottom: spacing["2xl"] }}>
            {my.businessProfile.subtitle}
          </AppText>

          <View style={{ gap: spacing.xl }}>
            <Field label={my.businessProfile.nameLabel}>
              <TextInput
                value={form.businessName}
                onChangeText={(t) => set("businessName", t)}
                style={styles.input}
                placeholderTextColor={colors.text.tertiary}
              />
            </Field>

            <Field label={my.businessProfile.typeLabel}>
              <View style={styles.pillRow}>
                {TYPES.map((t) => {
                  const active = form.businessType === t.value;
                  return (
                    <Pressable
                      key={t.value}
                      onPress={() => set("businessType", t.value)}
                      style={[styles.pill, active && styles.pillActive]}
                    >
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
                onChangeText={(t) =>
                  set(
                    "competitors",
                    t.split(",").map((s) => s.trim()).filter(Boolean)
                  )
                }
                placeholder={my.businessProfile.competitorsPlaceholder}
                style={styles.input}
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
            style={({ pressed }) => [
              styles.saveBtn,
              { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: saving ? 0.6 : 1 },
            ]}
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
  root: { flex: 1, backgroundColor: colors.bg.base },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.sectionX,
    paddingBottom: spacing.lg,
  },
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
  },
  pillActive: {
    backgroundColor: colors.accent.base,
    borderColor: colors.accent.base,
  },
  footer: {
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
