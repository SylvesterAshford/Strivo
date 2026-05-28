import { useState } from "react";
import { useRouter } from "expo-router";
import { WizardStep } from "@/components/layout/WizardStep";
import { TextField } from "@/components/ui/TextField";
import { useOnboarding } from "@/stores/onboarding";
import { my } from "@/i18n/my";

export default function ExpensesStep() {
  const router = useRouter();
  const draft = useOnboarding();
  const [value, setValue] = useState(
    draft.monthlyExpensesMmk !== null ? String(draft.monthlyExpensesMmk) : ""
  );

  const onNext = () => {
    const n = parseInt(value.replace(/[^0-9]/g, ""), 10);
    draft.patch({ monthlyExpensesMmk: Number.isFinite(n) && n >= 0 ? n : null });
    router.push("/(onboarding)/competitors");
  };

  return (
    <WizardStep
      step={5}
      totalSteps={11}
      title={my.onboarding.expensesTitle}
      subtitle={my.onboarding.expensesSubtitle}
      ctaLabel={my.common.next}
      onCta={onNext}
      ctaDisabled={value.trim().length === 0}
    >
      <TextField
        value={value}
        onChangeText={setValue}
        keyboardType="number-pad"
        placeholder={my.onboarding.expensesPlaceholder}
        autoFocus
      />
    </WizardStep>
  );
}
