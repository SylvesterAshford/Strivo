"use client";

import { useQuery } from "@tanstack/react-query";
import { Screen } from "@/components/layout/Screen";
import { SubHeader } from "@/components/layout/SubHeader";
import { SegmentsCard } from "@/components/analytics/widgets";
import { fetchInsights } from "@/lib/api";
import { my } from "@/i18n/my";

export default function SegmentsDetail() {
  const { data } = useQuery({
    queryKey: ["insights"],
    queryFn: fetchInsights,
    staleTime: 5 * 60_000,
  });

  if (!data || data.ready === false) {
    return (
      <Screen>
        <SubHeader title={my.analytics.segments} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SubHeader title={my.analytics.segments} />
      <SegmentsCard metrics={data.insights.metrics} />
    </Screen>
  );
}
