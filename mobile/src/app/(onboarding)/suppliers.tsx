import { useState } from "react";
import { useRouter } from "expo-router";
import { WizardStep } from "@/components/layout/WizardStep";
import { TextField } from "@/components/ui/TextField";
import { useOnboarding } from "@/stores/onboarding";
import { my } from "@/i18n/my";
import type { SupplierSeed } from "@/lib/api";

function parseSuppliers(s: string): SupplierSeed[] {
  return s
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((line) => {
      const [rawName, rawSupplies] = line.split(":").map((x) => x.trim());
      const name = rawName ?? "";
      if (!name) return null;
      return rawSupplies ? { name, supplies: rawSupplies } : { name };
    })
    .filter((x): x is SupplierSeed => x !== null);
}

export default function SuppliersStep() {
  const router = useRouter();
  const draft = useOnboarding();
  const [text, setText] = useState(
    draft.suppliersSeed
      .map((s) => (s.supplies ? `${s.name} : ${s.supplies}` : s.name))
      .join("\n")
  );

  const advance = (suppliers: SupplierSeed[]) => {
    draft.patch({ suppliersSeed: suppliers });
    router.push("/(onboarding)/bulk-import");
  };

  return (
    <WizardStep
      step={9}
      totalSteps={10}
      title={my.onboarding.suppliersTitle}
      subtitle={my.onboarding.suppliersSubtitle}
      ctaLabel={my.common.next}
      onCta={() => advance(parseSuppliers(text))}
      ctaDisabled={text.trim().length === 0}
      secondaryLabel={my.onboarding.skipLabel}
      onSecondary={() => advance([])}
    >
      <TextField
        value={text}
        onChangeText={setText}
        placeholder={my.onboarding.suppliersPlaceholder}
        multiline
        numberOfLines={6}
        autoFocus
        style={{ minHeight: 140, textAlignVertical: "top" }}
      />
    </WizardStep>
  );
}
