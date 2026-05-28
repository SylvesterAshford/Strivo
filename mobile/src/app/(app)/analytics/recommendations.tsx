import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "@/components/layout/Screen";
import { SubHeader } from "@/components/layout/SubHeader";
import { RecCard } from "@/components/analytics/widgets";
import { fetchInsights } from "@/lib/api";
import { spacing } from "@/theme/tokens";
import { my } from "@/i18n/my";

export default function RecommendationsDetail() {
  const { data } = useQuery({
    queryKey: ["insights"],
    queryFn: fetchInsights,
    staleTime: 5 * 60_000,
  });

  if (!data || data.ready === false) {
    return (
      <Screen>
        <SubHeader title={my.analytics.recommendations} />
      </Screen>
    );
  }

  const recs = data.insights.recommendations;

  return (
    <Screen>
      <SubHeader title={my.analytics.recommendations} />
      <View style={{ gap: spacing.lg }}>
        <RecCard kind="promotion" rec={recs.promotion} />
        <RecCard kind="stock" rec={recs.stock} />
        <RecCard kind="pricing" rec={recs.pricing} />
        <RecCard kind="growth" rec={recs.growth} />
      </View>
    </Screen>
  );
}
