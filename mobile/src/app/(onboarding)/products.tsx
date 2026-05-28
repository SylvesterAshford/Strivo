import { useState } from "react";
import { useRouter } from "expo-router";
import { WizardStep } from "@/components/layout/WizardStep";
import { TextField } from "@/components/ui/TextField";
import { useOnboarding } from "@/stores/onboarding";
import { my } from "@/i18n/my";
import type { ProductSeed } from "@/lib/api";

// Parse "name : price" lines. Burmese digits (၀-၉) → ASCII. Lines without a
// colon become name-only entries with no price.
const BURMESE_DIGITS: Record<string, string> = {
  "၀": "0", "၁": "1", "၂": "2", "၃": "3", "၄": "4",
  "၅": "5", "၆": "6", "၇": "7", "၈": "8", "၉": "9",
};
function toAsciiDigits(s: string): string {
  return s.replace(/[၀-၉]/g, (d) => BURMESE_DIGITS[d] ?? d);
}

function parseProducts(s: string): ProductSeed[] {
  return s
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 50)
    .map((line) => {
      const [rawName, rawPrice] = line.split(":").map((x) => x.trim());
      const name = rawName ?? "";
      if (!name) return null;
      const priceNum = rawPrice ? parseInt(toAsciiDigits(rawPrice).replace(/[^0-9]/g, ""), 10) : NaN;
      return Number.isFinite(priceNum) && priceNum >= 0
        ? { name, priceMmk: priceNum }
        : { name };
    })
    .filter((x): x is ProductSeed => x !== null);
}

export default function ProductsStep() {
  const router = useRouter();
  const draft = useOnboarding();
  const [text, setText] = useState(
    draft.productsSeed
      .map((p) => (p.priceMmk !== undefined ? `${p.name} : ${p.priceMmk}` : p.name))
      .join("\n")
  );

  const advance = (products: ProductSeed[]) => {
    draft.patch({ productsSeed: products });
    router.push("/(onboarding)/suppliers");
  };

  return (
    <WizardStep
      step={9}
      totalSteps={11}
      title={my.onboarding.productsTitle}
      subtitle={my.onboarding.productsSubtitle}
      ctaLabel={my.common.next}
      onCta={() => advance(parseProducts(text))}
      ctaDisabled={text.trim().length === 0}
      secondaryLabel={my.onboarding.skipLabel}
      onSecondary={() => advance([])}
    >
      <TextField
        value={text}
        onChangeText={setText}
        placeholder={my.onboarding.productsPlaceholder}
        multiline
        numberOfLines={6}
        autoFocus
        style={{ minHeight: 140, textAlignVertical: "top" }}
      />
    </WizardStep>
  );
}
