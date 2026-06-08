"use client";

import { View } from "@/rn";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "@/components/layout/Screen";
import { SubHeader } from "@/components/layout/SubHeader";
import { RevenueTrend, ForecastCard } from "@/components/analytics/widgets";
import { fetchInsights } from "@/lib/api";
import { spacing } from "@/theme/tokens";
import { my } from "@/i18n/my";

export default function TrendDetail() {
  const { data } = useQuery({
    queryKey: ["insights"],
    queryFn: fetchInsights,
    staleTime: 5 * 60_000,
  });

  if (!data || data.ready === false) {
    return (
      <Screen>
        <SubHeader title={my.analytics.sectionTrend} />
      </Screen>
    );
  }

  const ins = data.insights;

  return (
    <Screen>
      <SubHeader title={my.analytics.sectionTrend} />
      <View style={{ gap: spacing.lg }}>
        <RevenueTrend metrics={ins.metrics} />
        <ForecastCard metrics={ins.metrics} note={ins.forecastNote} />
      </View>
    </Screen>
  );
}
