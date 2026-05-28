import { saveProfile } from "@/lib/api";
import type { OnboardingDraft } from "@/stores/onboarding";
import type { HeroMetric } from "@/stores/profile";

// Pick the natural hero metric for a given business type.
function defaultHero(type: string | null): HeroMetric {
  if (type === "services" || type === "b2b_trading") return "outstanding";
  return "today_sales";
}

interface ProfileStoreSetters {
  setBusinessName: (v: string) => void;
  setBusinessType: (v: import("@/stores/profile").BusinessType) => void;
  setHeroMetric: (v: HeroMetric) => void;
  completeOnboarding: () => void;
}

// Flush the wizard draft to the backend and flip the onboarded flag.
// Throws on save failure so the caller can surface the message.
export async function finishOnboarding(draft: OnboardingDraft, profile: ProfileStoreSetters): Promise<void> {
  // Mirror the draft into the local profile store so Home/Header pick it up.
  profile.setBusinessName(draft.businessName);
  if (draft.businessType) profile.setBusinessType(draft.businessType as import("@/stores/profile").BusinessType);
  profile.setHeroMetric(defaultHero(draft.businessType));

  // Only send fields with meaningful values — Zod rejects empty `businessName`
  // and we don't want a half-filled draft to fail the whole save.
  const body: Partial<Parameters<typeof saveProfile>[0]> = {};
  if (draft.businessName.trim()) body.businessName = draft.businessName.trim();
  if (draft.businessType) body.businessType = draft.businessType;
  if (draft.productService.trim()) body.productService = draft.productService.trim();
  if (draft.posEnabled !== null) body.posEnabled = draft.posEnabled;
  if (draft.salesPeriods.length) body.salesPeriods = draft.salesPeriods;
  if (Object.keys(draft.salesValues).length) body.salesValues = draft.salesValues;
  if (draft.monthlyExpensesMmk !== null) {
    body.monthlyExpensesMmk = draft.monthlyExpensesMmk;
    body.budgetMmk = draft.monthlyExpensesMmk;
  }
  if (draft.competitors.length) body.competitors = draft.competitors;
  if (draft.competitorDetails.length) body.competitorDetails = draft.competitorDetails;
  if (draft.customersSeed.length) body.customersSeed = draft.customersSeed;
  if (draft.productsSeed.length) body.productsSeed = draft.productsSeed;
  if (draft.suppliersSeed.length) body.suppliersSeed = draft.suppliersSeed;

  await saveProfile(body);
  profile.completeOnboarding();
}
