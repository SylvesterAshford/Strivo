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

interface FinishOptions {
  // When true, await the backend save before resolving. Default false —
  // optimistic completion so a slow backend can't trap the user on the wizard.
  awaitSave?: boolean;
}

/** Build the conditional PUT body from a draft. */
function buildBody(draft: OnboardingDraft): Partial<Parameters<typeof saveProfile>[0]> {
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
  return body;
}

/**
 * Finish onboarding. Mirrors the draft into the local profile store, then
 * either awaits the backend save (when `awaitSave: true`) or fires it in the
 * background (default). Always flips the `onboarded` flag so the router
 * advances to the app.
 */
export async function finishOnboarding(
  draft: OnboardingDraft,
  profile: ProfileStoreSetters,
  options: FinishOptions = {}
): Promise<void> {
  // Mirror the draft into the local profile store so Home/Header pick it up.
  profile.setBusinessName(draft.businessName);
  if (draft.businessType) {
    profile.setBusinessType(draft.businessType as import("@/stores/profile").BusinessType);
  }
  profile.setHeroMetric(defaultHero(draft.businessType));

  const body = buildBody(draft);
  const savePromise = saveProfile(body);

  if (options.awaitSave) {
    await savePromise;
    profile.completeOnboarding();
    return;
  }

  // Optimistic: flip onboarded immediately so the wizard unmounts and the
  // user lands on Home. The save still runs; failures are logged only so the
  // user is never stuck on a spinner because of network or backend latency.
  profile.completeOnboarding();
  savePromise.catch((err) => {
    console.warn("[onboarding] background profile save failed:", err);
  });
}
