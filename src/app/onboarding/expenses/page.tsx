"use client";

import { useState } from "react";
import { useRouter } from "@/rn/router";
import { View } from "@/rn";
import { WizardStep } from "@/components/layout/WizardStep";
import { TextField } from "@/components/ui/TextField";
import { AppText } from "@/components/ui/AppText";
import { useOnboarding } from "@/stores/onboarding";
import { my } from "@/i18n/my";
import { spacing } from "@/theme/tokens";
import type { ExpenseSeed } from "@/lib/api";

// Parse the categories textarea: "name : amount" per line, amount optional.
function parseCategories(text: string): ExpenseSeed[] {
  return text
    .split(/[\n,]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawName, rawAmount] = line.split(":").map((s) => s?.trim() ?? "");
      const name = rawName?.replace(/[ -]/g, "").slice(0, 40);
      const cleanedAmount = rawAmount?.replace(/[^0-9]/g, "");
      const amount = cleanedAmount ? parseInt(cleanedAmount, 10) : NaN;
      return name ? { category: name, ...(Number.isFinite(amount) && amount > 0 ? { monthlyMmk: amount } : {}) } : null;
    })
    .filter((x): x is ExpenseSeed => x !== null)
    .slice(0, 20);
}

function formatCategories(seeds: ExpenseSeed[]): string {
  return seeds.map((s) => (s.monthlyMmk ? `${s.category} : ${s.monthlyMmk}` : s.category)).join("\n");
}

export default function ExpensesStep() {
  const router = useRouter();
  const draft = useOnboarding();
  const [total, setTotal] = useState(draft.monthlyExpensesMmk !== null ? String(draft.monthlyExpensesMmk) : "");
  const [categoriesText, setCategoriesText] = useState(formatCategories(draft.expensesSeed));

  const onNext = () => {
    const n = parseInt(total.replace(/[^0-9]/g, ""), 10);
    const parsedCategories = parseCategories(categoriesText);
    draft.patch({ monthlyExpensesMmk: Number.isFinite(n) && n >= 0 ? n : null, expensesSeed: parsedCategories });
    router.push("/onboarding/competitors");
  };

  return (
    <WizardStep
      step={4}
      totalSteps={10}
      title={my.onboarding.expensesTitle}
      subtitle={my.onboarding.expensesSubtitle}
      ctaLabel={my.common.next}
      onCta={onNext}
      ctaDisabled={total.trim().length === 0}
    >
      <View style={{ gap: spacing.lg }}>
        <TextField value={total} onChangeText={setTotal} keyboardType="number-pad" placeholder={my.onboarding.expensesPlaceholder} autoFocus />

        <View style={{ gap: spacing.xs }}>
          <AppText variant="bodyMedium">{my.onboarding.expenseCategoriesTitle}</AppText>
          <AppText variant="caption" color="secondary">
            {my.onboarding.expenseCategoriesSubtitle}
          </AppText>
        </View>

        <TextField value={categoriesText} onChangeText={setCategoriesText} placeholder={my.onboarding.expenseCategoriesPlaceholder} multiline numberOfLines={6} />
      </View>
    </WizardStep>
  );
}
