import { useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { AppText } from "@/components/ui/AppText";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { colors, spacing, radius } from "@/theme/tokens";
import { my } from "@/i18n/my";
import { confirmFacts, type DraftFact } from "@/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const KIND_LABELS: Record<DraftFact["kind"], string> = {
  sale: "ရောင်းအား",
  expense: "ကုန်ကျစရိတ်",
  receivable: "ရရန်ကျန်",
  note: "မှတ်ချက်",
};

function FactCard({
  fact,
  index,
  onChange,
  onRemove,
}: {
  fact: DraftFact;
  index: number;
  onChange: (idx: number, updated: DraftFact) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.kindBadge}>
          <AppText variant="caption" color="secondary">
            {KIND_LABELS[fact.kind]}
          </AppText>
        </View>
        <Pressable onPress={() => onRemove(index)} hitSlop={8}>
          <Icon name="x" size={16} color={colors.text.tertiary} />
        </Pressable>
      </View>

      <TextInput
        value={fact.description}
        onChangeText={(t) => onChange(index, { ...fact, description: t })}
        style={styles.descInput}
        multiline
        placeholderTextColor={colors.text.tertiary}
        placeholder="ဖော်ပြချက်"
      />

      {fact.amountMmk !== undefined && (
        <TextInput
          value={fact.amountMmk > 0 ? String(fact.amountMmk) : ""}
          onChangeText={(t) => {
            const n = parseInt(t.replace(/[^0-9]/g, ""), 10);
            onChange(index, { ...fact, amountMmk: Number.isFinite(n) ? n : undefined });
          }}
          style={styles.amountInput}
          keyboardType="numeric"
          placeholder="ပမာဏ (ကျပ်)"
          placeholderTextColor={colors.text.tertiary}
        />
      )}

      {fact.counterparty && (
        <TextInput
          value={fact.counterparty}
          onChangeText={(t) => onChange(index, { ...fact, counterparty: t || undefined })}
          style={styles.counterpartyInput}
          placeholder="ဖောက်သည် / ပေးသွင်းသူ"
          placeholderTextColor={colors.text.tertiary}
        />
      )}
    </View>
  );
}

export default function ConfirmFactsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    recordingId: string;
    transcript: string;
    facts: string;
  }>();

  const [facts, setFacts] = useState<DraftFact[]>(() => {
    try {
      return JSON.parse(params.facts ?? "[]") as DraftFact[];
    } catch {
      return [];
    }
  });

  const [saving, setSaving] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const handleChange = (idx: number, updated: DraftFact) => {
    setFacts((prev) => prev.map((f, i) => (i === idx ? updated : f)));
  };

  const handleRemove = (idx: number) => {
    setFacts((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (facts.length === 0) {
      router.replace("/");
      return;
    }
    setSaving(true);
    try {
      await confirmFacts(params.recordingId ?? null, facts);
      // Invalidate all data queries so home/reports/analytics refresh immediately.
      await queryClient.invalidateQueries({ queryKey: ["home"] });
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      router.replace("/");
    } catch {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.root, { paddingTop: insets.top + spacing.lg }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Icon name="arrow-left" size={22} color={colors.text.primary} />
          </Pressable>
          <AppText variant="title">{my.common.done}</AppText>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Transcript toggle */}
          <Pressable
            onPress={() => setShowTranscript((v) => !v)}
            style={styles.transcriptToggle}
          >
            <Eyebrow>TRANSCRIPT</Eyebrow>
            <Icon
              name={showTranscript ? "chevron-up" : "chevron-down"}
              size={14}
              color={colors.text.secondary}
            />
          </Pressable>

          {showTranscript && (
            <AppText variant="body" color="secondary" style={styles.transcriptText}>
              {params.transcript}
            </AppText>
          )}

          {/* Fact list */}
          <View style={{ marginTop: spacing["3xl"] }}>
            <Eyebrow style={{ marginBottom: spacing.lg }}>FACTS</Eyebrow>

            {facts.length === 0 ? (
              <AppText variant="body" color="tertiary" style={{ textAlign: "center", marginTop: spacing["3xl"] }}>
                {"အချက်အလက် မတွေ့ပါ"}
              </AppText>
            ) : (
              facts.map((f, i) => (
                <FactCard
                  key={i}
                  fact={f}
                  index={i}
                  onChange={handleChange}
                  onRemove={handleRemove}
                />
              ))
            )}
          </View>

          <View style={{ height: spacing["5xl"] }} />
        </ScrollView>

        {/* Footer actions */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Pressable
            onPress={() => router.replace("/")}
            style={styles.discardBtn}
          >
            <AppText variant="body" color="secondary">
              {my.common.discard}
            </AppText>
          </Pressable>

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
                {my.common.saveAll}
              </AppText>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sectionX,
    paddingBottom: spacing.lg,
  },
  scroll: {
    paddingHorizontal: spacing.sectionX,
  },
  transcriptToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  transcriptText: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.attentionCard,
  },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.attentionCard,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  kindBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.accent.soft,
    borderRadius: 6,
  },
  descInput: {
    fontFamily: "Inter",
    fontSize: 13,
    color: colors.text.primary,
    minHeight: 40,
    paddingVertical: spacing.xs,
  },
  amountInput: {
    fontFamily: "Inter",
    fontSize: 13,
    color: colors.text.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  counterpartyInput: {
    fontFamily: "Inter",
    fontSize: 11,
    color: colors.text.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: spacing.sectionX,
    paddingTop: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.bg.base,
  },
  discardBtn: {
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
