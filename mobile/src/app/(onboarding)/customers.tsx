import { useState } from "react";
import { useRouter } from "expo-router";
import { WizardStep } from "@/components/layout/WizardStep";
import { TextField } from "@/components/ui/TextField";
import { useOnboarding } from "@/stores/onboarding";
import { my } from "@/i18n/my";

function parseList(s: string): string[] {
  return s
    .split(/[,၊\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 50);
}

export default function CustomersStep() {
  const router = useRouter();
  const draft = useOnboarding();
  const [text, setText] = useState(draft.customersSeed.join("\n"));

  const advance = (customers: string[]) => {
    draft.patch({ customersSeed: customers });
    router.push("/(onboarding)/products");
  };

  return (
    <WizardStep
      step={7}
      totalSteps={10}
      title={my.onboarding.customersTitle}
      subtitle={my.onboarding.customersSubtitle}
      ctaLabel={my.common.next}
      onCta={() => advance(parseList(text))}
      ctaDisabled={text.trim().length === 0}
      secondaryLabel={my.onboarding.skipLabel}
      onSecondary={() => advance([])}
    >
      <TextField
        value={text}
        onChangeText={setText}
        placeholder={my.onboarding.customersPlaceholder}
        multiline
        numberOfLines={6}
        autoFocus
        style={{ minHeight: 140, textAlignVertical: "top" }}
      />
    </WizardStep>
  );
}
