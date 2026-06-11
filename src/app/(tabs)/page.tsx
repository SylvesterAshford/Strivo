"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "@/rn/router";
import { Screen } from "@/components/layout/Screen";
import { HomeHeader } from "@/components/home/HomeHeader";
import { ColdStartHero } from "@/components/home/ColdStartHero";
import { AdvisorCard } from "@/components/home/AdvisorCard";
import { AdvisorActions } from "@/components/home/AdvisorActions";
import { RecentEntries } from "@/components/home/RecentEntries";
import { ProfileNudge } from "@/components/home/ProfileNudge";
import { UnlockNext } from "@/components/app/UnlockNext";
import { QueryError } from "@/components/layout/QueryError";
import { Skeleton } from "@/components/layout/Skeleton";
import { View } from "@/rn";
import { spacing } from "@/theme/tokens";
import { useProfile } from "@/stores/profile";
import { fetchHome } from "@/lib/api";

// Monthly Profit Advisor home. The advisor (derived from the most-recent month
// with data) is the centerpiece; the daily dashboard was retired because pilot
// owners enter data in monthly batches, not daily. RecentEntries stays at the
// bottom so the owner can confirm their data landed.
export default function HomeScreen() {
  const ownerName = useProfile((s) => s.ownerName || s.businessName || "");
  const qc = useQueryClient();

  const { data: home, isError, isLoading, refetch } = useQuery({
    queryKey: ["home"],
    queryFn: fetchHome,
    // 60s: a quick tab-flick back within the minute skips the focus refetch;
    // after that it refreshes. Cuts the redundant focus-refetch bursts.
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  // Refetch on navigation back to Home so a fresh monthly import shows up.
  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    }, [qc]),
  );

  const fallbackEntries = home?.recentFallback ?? [];
  const hasAnyData = !!home?.advisor || fallbackEntries.length > 0;

  return (
    <Screen contentStyle={{ maxWidth: 640 }}>
      <HomeHeader name={ownerName} />
      <ProfileNudge />
      {isError && !home ? (
        <QueryError onRetry={() => void refetch()} />
      ) : isLoading && !home ? (
        <View style={{ gap: spacing.lg }}>
          <Skeleton height={220} style={{ borderRadius: 14 }} />
          <Skeleton height={72} style={{ borderRadius: 14 }} />
          <Skeleton height={72} style={{ borderRadius: 14 }} />
        </View>
      ) : home?.advisor ? (
        <>
          <AdvisorCard advisor={home.advisor} />
          <AdvisorActions actions={home.advisor.actions} periodMonth={home.advisor.periodMonth} />
          {/* One recruiting card max — names the highest-value missing input. */}
          <UnlockNext />
          <RecentEntries entries={fallbackEntries} label="RECENT" />
        </>
      ) : hasAnyData ? (
        // Data exists but the advisor couldn't be derived — degrade to the feed
        // rather than a misleading "no data" cold start.
        <RecentEntries entries={fallbackEntries} label="RECENT" />
      ) : (
        <ColdStartHero />
      )}
    </Screen>
  );
}
