"use client";

import { useQuery } from "@tanstack/react-query";
import { Screen } from "@/components/layout/Screen";
import { SubHeader } from "@/components/layout/SubHeader";
import { SwotPanel } from "@/components/analytics/widgets";
import { fetchInsights } from "@/lib/api";
import { my } from "@/i18n/my";

export default function SwotDetail() {
  const { data } = useQuery({
    queryKey: ["insights"],
    queryFn: fetchInsights,
    staleTime: 5 * 60_000,
  });

  if (!data || data.ready === false) {
    return (
      <Screen>
        <SubHeader title={my.analytics.swot} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SubHeader title={my.analytics.swot} />
      <SwotPanel swot={data.insights.swot} />
    </Screen>
  );
}
