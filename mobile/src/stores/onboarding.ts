import { create } from "zustand";
import type { SalesPeriod, RivalDetail, ProductSeed, SupplierSeed } from "@/lib/api";

// In-progress onboarding state. Each step writes here on Next; the final
// welcome screen flushes the whole draft to the backend via PUT /profile.
export interface OnboardingDraft {
  businessName: string;
  productService: string;
  businessType: string | null;
  posEnabled: boolean | null;
  salesPeriods: SalesPeriod[];
  salesValues: Partial<Record<SalesPeriod, number>>;
  monthlyExpensesMmk: number | null;
  competitors: string[];
  competitorDetails: RivalDetail[];
  customersSeed: string[];
  productsSeed: ProductSeed[];
  suppliersSeed: SupplierSeed[];
}

interface OnboardingState extends OnboardingDraft {
  patch: (p: Partial<OnboardingDraft>) => void;
  reset: () => void;
  filledCount: () => number;
}

const initial: OnboardingDraft = {
  businessName: "",
  productService: "",
  businessType: null,
  posEnabled: null,
  salesPeriods: [],
  salesValues: {},
  monthlyExpensesMmk: null,
  competitors: [],
  competitorDetails: [],
  customersSeed: [],
  productsSeed: [],
  suppliersSeed: [],
};

export const useOnboarding = create<OnboardingState>((set, get) => ({
  ...initial,
  patch: (p) => set(p),
  reset: () => set(initial),
  filledCount: () => {
    const s = get();
    let n = 0;
    if (s.businessName.trim()) n++;
    if (s.productService.trim()) n++;
    if (s.posEnabled !== null) n++;
    if (s.salesPeriods.length > 0) n++;
    if (Object.keys(s.salesValues).length > 0) n++;
    if (s.monthlyExpensesMmk !== null) n++;
    if (s.competitors.length > 0) n++;
    return n;
  },
}));
