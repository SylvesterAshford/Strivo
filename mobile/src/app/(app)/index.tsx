import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { Screen } from "@/components/layout/Screen";
import { HomeHeader } from "@/components/home/HomeHeader";
import { ColdStartHero } from "@/components/home/ColdStartHero";
import { HeroMetric } from "@/components/home/HeroMetric";
import { DailySummary } from "@/components/home/DailySummary";
import { AlertChips } from "@/components/home/AlertChips";
import { RecentEntries } from "@/components/home/RecentEntries";
import { ProfileNudge } from "@/components/home/ProfileNudge";
import { useProfile } from "@/stores/profile";
import { fetchHome } from "@/lib/api";
import type { HeroMetric as HeroMetricKey } from "@/stores/profile";
import type { HomeData } from "@/lib/api";

function heroAmount(metric: HeroMetricKey, home: HomeData): number {
  switch (metric) {
    case "today_sales":
      return home.todaySalesMmk;
    case "week_sales":
      return home.weekSalesMmk;
    case "month_revenue":
      return home.monthRevenueMmk;
    case "outstanding":
      return home.outstandingMmk;
  }
}

export default function HomeScreen() {
  const ownerName = useProfile((s) => s.ownerName || s.businessName || "");
  const heroMetric = useProfile((s) => s.heroMetric);
  const qc = useQueryClient();

  const { data: home } = useQuery({
    queryKey: ["home"],
    queryFn: fetchHome,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // Tabs stay mounted in expo-router, so React Query never sees a remount
  // when the user navigates back. Refetch on every tab focus so freshly
  // imported facts show up the moment Home is opened.
  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    }, [qc])
  );

  const hasFacts =
    (home?.todaySalesMmk ?? 0) > 0 ||
    (home?.todayExpensesMmk ?? 0) > 0 ||
    (home?.recentToday?.length ?? 0) > 0;

  return (
    <Screen>
      <HomeHeader name={ownerName} />
      <ProfileNudge />
      {hasFacts && home ? (
        <>
          <DailySummary
            todaySalesMmk={home.todaySalesMmk}
            yesterdaySalesMmk={home.yesterdaySalesMmk}
          />
          <HeroMetric metric={heroMetric} amountMmk={heroAmount(heroMetric, home)} />
          <AlertChips
            outstandingMmk={home.outstandingMmk}
            todaySalesMmk={home.todaySalesMmk}
            todayExpensesMmk={home.todayExpensesMmk}
          />
          <RecentEntries entries={home.recentToday} />
        </>
      ) : (
        <ColdStartHero />
      )}
    </Screen>
  );
}
