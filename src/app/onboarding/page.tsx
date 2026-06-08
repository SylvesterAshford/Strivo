"use client";

import { useState } from "react";
import { View } from "@/rn";
import { useRouter } from "@/rn/router";
import { WizardStep } from "@/components/layout/WizardStep";
import { Chip } from "@/components/ui/Chip";
import { TextField } from "@/components/ui/TextField";
import { AppText } from "@/components/ui/AppText";
import { useOnboarding } from "@/stores/onboarding";
import { spacing } from "@/theme/tokens";
import { my } from "@/i18n/my";

const TYPES: { value: string; label: string }[] = [
  { value: "fnb", label: my.businessType.fnb },
  { value: "retail", label: my.businessType.retail },
  { value: "services", label: my.businessType.services },
  { value: "b2b_trading", label: my.businessType.b2bTrading },
  { value: "other", label: my.businessType.other },
];

export default function ProductStep() {
  const router = useRouter();
  const draft = useOnboarding();
  const [name, setName] = useState(draft.businessName);
  const [type, setType] = useState(draft.businessType);
  const [product, setProduct] = useState(draft.productService);

  const onNext = () => {
    draft.patch({ businessName: name.trim(), businessType: type, productService: product.trim() });
    router.push("/onboarding/periods");
  };

  const canContinue = name.trim().length > 0 && !!type && product.trim().length > 0;

  return (
    <WizardStep
      step={1}
      totalSteps={10}
      title={my.onboarding.productTitle}
      subtitle={my.onboarding.productSubtitle}
      ctaLabel={my.common.next}
      onCta={onNext}
      ctaDisabled={!canContinue}
    >
      <AppText variant="caption" color="secondary">
        {my.onboarding.namePlaceholder}
      </AppText>
      <TextField value={name} onChangeText={setName} placeholder={my.onboarding.namePlaceholder} autoFocus />

      <AppText variant="caption" color="secondary" style={{ marginTop: spacing.md }}>
        {my.onboarding.typeTitle}
      </AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {TYPES.map((t) => (
          <Chip key={t.value} label={t.label} selected={type === t.value} onPress={() => setType(t.value)} />
        ))}
      </View>

      <AppText variant="caption" color="secondary" style={{ marginTop: spacing.md }}>
        {my.onboarding.productPlaceholder}
      </AppText>
      <TextField value={product} onChangeText={setProduct} placeholder={my.onboarding.productPlaceholder} />
    </WizardStep>
  );
}
