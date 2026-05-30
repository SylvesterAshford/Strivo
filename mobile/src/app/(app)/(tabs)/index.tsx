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

  // Show the data view when there's ANY financial activity — today, this week,
  // or this month. The cold-start hero only shows on a truly empty workspace.
  const hasFacts =
    (home?.todaySalesMmk ?? 0) > 0 ||
    (home?.todayExpensesMmk ?? 0) > 0 ||
    (home?.weekSalesMmk ?? 0) > 0 ||
    (home?.monthRevenueMmk ?? 0) > 0 ||
    (home?.outstandingMmk ?? 0) > 0 ||
    (home?.recentFallback?.length ?? 0) > 0;

  // When today has no entries, fall back to the most recent entries across
  // all days so the feed is never empty for an active account.
  const todayEntries = home?.recentToday ?? [];
  const fallbackEntries = home?.recentFallback ?? [];
  const entriesToShow = todayEntries.length > 0 ? todayEntries : fallbackEntries;
  const entriesLabel = todayEntries.length > 0 ? "TODAY" : "RECENT";

  return (
    <Screen>
      <HomeHeader name={ownerName} />
      <ProfileNudge />
      {hasFacts && home ? (
        <>
          <DailySummary
            todaySalesMmk={home.todaySalesMmk}
            yesterdaySalesMmk={home.yesterdaySalesMmk}
            weekSalesMmk={home.weekSalesMmk}
            monthRevenueMmk={home.monthRevenueMmk}
          />
          <HeroMetric metric={heroMetric} amountMmk={heroAmount(heroMetric, home)} />
          <AlertChips
            outstandingMmk={home.outstandingMmk}
            todaySalesMmk={home.todaySalesMmk}
            todayExpensesMmk={home.todayExpensesMmk}
          />
          <RecentEntries entries={entriesToShow} label={entriesLabel} />
        </>
      ) : (
        <ColdStartHero />
      )}
    </Screen>
  );
}
