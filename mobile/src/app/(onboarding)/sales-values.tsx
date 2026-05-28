import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { WizardStep } from "@/components/layout/WizardStep";
import { TextField } from "@/components/ui/TextField";
import { AppText } from "@/components/ui/AppText";
import { useOnboarding } from "@/stores/onboarding";
import { spacing } from "@/theme/tokens";
import { my } from "@/i18n/my";
import type { SalesPeriod } from "@/lib/api";

const LABELS: Record<SalesPeriod, string> = {
  daily: my.onboarding.periodDaily,
  weekly: my.onboarding.periodWeekly,
  monthly: my.onboarding.periodMonthly,
  yearly: my.onboarding.periodYearly,
};

export default function SalesValuesStep() {
  const router = useRouter();
  const draft = useOnboarding();
  const periods = draft.salesPeriods;
  const [values, setValues] = useState<Partial<Record<SalesPeriod, string>>>(() =>
    Object.fromEntries(
      Object.entries(draft.salesValues).map(([k, v]) => [k, String(v)])
    )
  );

  const setVal = (p: SalesPeriod, v: string) => setValues((prev) => ({ ...prev, [p]: v }));

  const onNext = () => {
    const parsed: Partial<Record<SalesPeriod, number>> = {};
    for (const p of periods) {
      const n = parseInt((values[p] ?? "").replace(/[^0-9]/g, ""), 10);
      if (Number.isFinite(n) && n >= 0) parsed[p] = n;
    }
    draft.patch({ salesValues: parsed });
    router.push("/(onboarding)/expenses");
  };

  // If user lands here without periods, push them back.
  if (periods.length === 0) {
    router.replace("/(onboarding)/periods");
    return null;
  }

  const allFilled = periods.every((p) => (values[p] ?? "").trim().length > 0);

  return (
    <WizardStep
      step={4}
      totalSteps={11}
      title={my.onboarding.salesValuesTitle}
      subtitle={my.onboarding.salesValuesSubtitle}
      ctaLabel={my.common.next}
      onCta={onNext}
      ctaDisabled={!allFilled}
    >
      <View style={{ gap: spacing.lg }}>
        {periods.map((p) => (
          <View key={p} style={{ gap: spacing.xs }}>
            <AppText variant="caption" color="secondary">
              {LABELS[p]}
            </AppText>
            <TextField
              value={values[p] ?? ""}
              onChangeText={(v) => setVal(p, v)}
              keyboardType="number-pad"
              placeholder="0"
            />
          </View>
        ))}
      </View>
    </WizardStep>
  );
}
