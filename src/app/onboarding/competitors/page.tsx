"use client";

import { useState } from "react";
import { useRouter } from "@/rn/router";
import { WizardStep } from "@/components/layout/WizardStep";
import { TextField } from "@/components/ui/TextField";
import { useOnboarding } from "@/stores/onboarding";
import { my } from "@/i18n/my";

export default function CompetitorsStep() {
  const router = useRouter();
  const draft = useOnboarding();
  const [text, setText] = useState(draft.competitors.join("၊ "));

  const parse = (s: string) =>
    s
      .split(/[,၊]/)
      .map((x) => x.trim())
      .filter(Boolean);

  const onNext = () => {
    const list = parse(text);
    draft.patch({ competitors: list, competitorDetails: list.length === 0 ? [] : draft.competitorDetails });
    if (list.length === 0) {
      router.push("/onboarding/customers");
    } else {
      router.push("/onboarding/rival-details");
    }
  };

  const onNone = () => {
    draft.patch({ competitors: [], competitorDetails: [] });
    router.push("/onboarding/customers");
  };

  return (
    <WizardStep
      step={5}
      totalSteps={10}
      title={my.onboarding.competitorsTitle}
      subtitle={my.onboarding.competitorsSubtitle}
      ctaLabel={my.common.next}
      onCta={onNext}
      ctaDisabled={text.trim().length === 0}
      secondaryLabel={my.onboarding.competitorsNone}
      onSecondary={onNone}
    >
      <TextField value={text} onChangeText={setText} placeholder="ဆိုင် က၊ ဆိုင် ခ" autoFocus />
    </WizardStep>
  );
}
