import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { WizardStep } from "@/components/layout/WizardStep";
import { SelectRow } from "@/components/ui/SelectRow";
import { useOnboarding } from "@/stores/onboarding";
import { spacing } from "@/theme/tokens";
import { my } from "@/i18n/my";

export default function PosStep() {
  const router = useRouter();
  const draft = useOnboarding();
  const [selected, setSelected] = useState<boolean | null>(draft.posEnabled);

  const onNext = () => {
    draft.patch({ posEnabled: selected });
    router.push("/(onboarding)/periods");
  };

  return (
    <WizardStep
      step={2}
      totalSteps={11}
      title={my.onboarding.posTitle}
      subtitle={my.onboarding.posSubtitle}
      ctaLabel={my.common.next}
      onCta={onNext}
      ctaDisabled={selected === null}
    >
      <View style={{ gap: spacing.md }}>
        <SelectRow label={my.onboarding.posYes} selected={selected === true} onPress={() => setSelected(true)} />
        <SelectRow label={my.onboarding.posNo} selected={selected === false} onPress={() => setSelected(false)} />
      </View>
    </WizardStep>
  );
}
