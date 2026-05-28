import { create } from "zustand";

export type BusinessType = "retail" | "fnb" | "services" | "b2b_trading" | "other";
export type HeroMetric = "today_sales" | "week_sales" | "month_revenue" | "outstanding";

interface ProfileState {
  businessName: string;
  ownerName: string;
  businessType: BusinessType | null;
  heroMetric: HeroMetric;
  onboarded: boolean;
  setBusinessName: (v: string) => void;
  setBusinessType: (v: BusinessType) => void;
  setHeroMetric: (v: HeroMetric) => void;
  completeOnboarding: () => void;
  reset: () => void;
}

// In-memory for Phase 1. Phase 1 task 5 syncs this to business_profile via the
// backend; persistence (AsyncStorage) lands when the API is wired.
export const useProfile = create<ProfileState>((set) => ({
  businessName: "",
  ownerName: "",
  businessType: null,
  heroMetric: "today_sales",
  onboarded: false,
  setBusinessName: (businessName) => set({ businessName }),
  setBusinessType: (businessType) => set({ businessType }),
  setHeroMetric: (heroMetric) => set({ heroMetric }),
  completeOnboarding: () => set({ onboarded: true }),
  reset: () =>
    set({ businessName: "", ownerName: "", businessType: null, heroMetric: "today_sales", onboarded: false }),
}));
