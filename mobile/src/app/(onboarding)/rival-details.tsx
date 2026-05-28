import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { WizardStep } from "@/components/layout/WizardStep";
import { Chip } from "@/components/ui/Chip";
import { TextField } from "@/components/ui/TextField";
import { AppText } from "@/components/ui/AppText";
import { useOnboarding } from "@/stores/onboarding";
import { spacing, radius, colors } from "@/theme/tokens";
import { my } from "@/i18n/my";
import type { RivalTier, RivalDetail } from "@/lib/api";

const TIERS: { value: RivalTier; label: string }[] = [
  { value: "discount", label: my.onboarding.tierDiscount },
  { value: "matcher", label: my.onboarding.tierMatcher },
  { value: "premium", label: my.onboarding.tierPremium },
];

interface Row {
  name: string;
  tier: RivalTier;
  audience: string;
}

export default function RivalDetailsStep() {
  const router = useRouter();
  const draft = useOnboarding();
  const names = draft.competitors;

  const [rows, setRows] = useState<Row[]>(() =>
    names.map((name) => {
      const existing = draft.competitorDetails.find((d) => d.name === name);
      return {
        name,
        tier: existing?.tier ?? "matcher",
        audience: existing?.audience ?? "",
      };
    })
  );

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const onNext = () => {
    const details: RivalDetail[] = rows.map((r) => ({
      name: r.name,
      tier: r.tier,
      audience: r.audience.trim(),
    }));
    draft.patch({ competitorDetails: details });
    router.push("/(onboarding)/customers");
  };

  // If user navigated here directly without competitors, bounce back.
  if (names.length === 0) {
    router.replace("/(onboarding)/competitors");
    return null;
  }

  return (
    <WizardStep
      step={7}
      totalSteps={11}
      title={my.onboarding.rivalDetailsTitle}
      subtitle={my.onboarding.rivalDetailsSubtitle}
      ctaLabel={my.common.next}
      onCta={onNext}
    >
      <View style={{ gap: spacing.lg }}>
        {rows.map((r, i) => (
          <View
            key={r.name + i}
            style={{
              padding: spacing.lg,
              backgroundColor: colors.bg.surface,
              borderRadius: radius.attentionCard,
              borderWidth: 1,
              borderColor: colors.border.default,
              gap: spacing.md,
            }}
          >
            <AppText variant="bodyMedium">{r.name}</AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {TIERS.map((t) => (
                <Chip
                  key={t.value}
                  label={t.label}
                  selected={r.tier === t.value}
                  onPress={() => setRow(i, { tier: t.value })}
                />
              ))}
            </View>
            <TextField
              value={r.audience}
              onChangeText={(v) => setRow(i, { audience: v })}
              placeholder={my.onboarding.audiencePlaceholder}
            />
          </View>
        ))}
      </View>
    </WizardStep>
  );
}
