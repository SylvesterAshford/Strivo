import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { WizardStep } from "@/components/layout/WizardStep";
import { Chip } from "@/components/ui/Chip";
import { useOnboarding } from "@/stores/onboarding";
import { spacing } from "@/theme/tokens";
import { my } from "@/i18n/my";
import type { SalesPeriod } from "@/lib/api";

const OPTIONS: { value: SalesPeriod; label: string }[] = [
  { value: "daily", label: my.onboarding.periodDaily },
  { value: "weekly", label: my.onboarding.periodWeekly },
  { value: "monthly", label: my.onboarding.periodMonthly },
  { value: "yearly", label: my.onboarding.periodYearly },
];

export default function PeriodsStep() {
  const router = useRouter();
  const draft = useOnboarding();
  const [chosen, setChosen] = useState<SalesPeriod[]>(draft.salesPeriods);

  const toggle = (p: SalesPeriod) => {
    setChosen((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const onNext = () => {
    draft.patch({ salesPeriods: chosen });
    router.push("/(onboarding)/sales-values");
  };

  return (
    <WizardStep
      step={2}
      totalSteps={10}
      title={my.onboarding.periodsTitle}
      subtitle={my.onboarding.periodsSubtitle}
      ctaLabel={my.common.next}
      onCta={onNext}
      ctaDisabled={chosen.length === 0}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {OPTIONS.map((o) => (
          <Chip key={o.value} label={o.label} selected={chosen.includes(o.value)} onPress={() => toggle(o.value)} />
        ))}
      </View>
    </WizardStep>
  );
}
