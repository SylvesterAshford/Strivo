import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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

// Persisted to localStorage on web so the profile + onboarded flag survive page
// reloads (the backend remains the source of truth and re-hydrates on sign-in).
export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
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
    }),
    {
      name: "strivo-profile",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : undefined!)),
    },
  ),
);
