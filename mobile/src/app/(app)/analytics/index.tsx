import { useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "@/components/layout/Screen";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Headline, ScoreCard, RiskCard } from "@/components/analytics/widgets";
import { SectionNavCard } from "@/components/analytics/SectionNavCard";
import { fetchInsights } from "@/lib/api";
import { colors, spacing, radius } from "@/theme/tokens";
import { my } from "@/i18n/my";

export default function AnalyticsOverview() {
  const router = useRouter();
  // Don't auto-fire AI analysis on tab open — wait for the user to tap.
  const [triggered, setTriggered] = useState(false);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["insights"],
    queryFn: fetchInsights,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    enabled: triggered,
  });

  // Initial state — show the Generate card.
  if (!triggered) {
    return (
      <Screen>
        <AppText variant="subhead" style={{ marginBottom: spacing.lg }}>
          {my.analytics.title}
        </AppText>
        <View style={styles.generateCard}>
          <View style={styles.iconBox}>
            <Icon name="sparkles" size={28} color={colors.accent.base} />
          </View>
          <AppText variant="serifLg" color="primary" style={{ textAlign: "center" }}>
            {my.analytics.generateTitle}
          </AppText>
          <AppText variant="body" color="secondary" style={{ textAlign: "center" }}>
            {my.analytics.generateBody}
          </AppText>
          <Button label={my.analytics.generateCta} onPress={() => setTriggered(true)} />
        </View>
      </Screen>
    );
  }

  if (isLoading || isFetching) {
    return (
      <Screen scroll={false}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent.base} size="large" />
          <AppText
            variant="body"
            color="secondary"
            style={{ marginTop: spacing.lg, textAlign: "center" }}
          >
            {my.analytics.analyzing}
          </AppText>
        </View>
      </Screen>
    );
  }

  // No daily-signal yet — same generate card but tell the user to record first.
  if (!data || data.ready === false) {
    return (
      <Screen>
        <AppText variant="subhead" style={{ marginBottom: spacing.lg }}>
          {my.analytics.title}
        </AppText>
        <View style={styles.generateCard}>
          <View style={styles.iconBox}>
            <Icon name="mic" size={28} color={colors.accent.base} />
          </View>
          <AppText variant="serifLg" color="primary" style={{ textAlign: "center" }}>
            {my.analytics.emptyHeadline}
          </AppText>
          <AppText variant="body" color="secondary" style={{ textAlign: "center" }}>
            Record sales and expenses to unlock AI insights
          </AppText>
          <Button label={my.coldStart.micHint} onPress={() => router.push("/record")} />
        </View>
      </Screen>
    );
  }

  const ins = data.insights;
  const swotCounts = {
    s: ins.swot.strengths.length,
    w: ins.swot.weaknesses.length,
    o: ins.swot.opportunities.length,
    t: ins.swot.threats.length,
  };
  const segmentCount = ins.metrics.customerSegments.filter((s) => s.customers > 0).length;

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
        <AppText variant="subhead">{my.analytics.title}</AppText>
        <Button
          label={my.scenarios.title}
          variant="secondary"
          onPress={() => router.push("/analytics/scenarios")}
        />
      </View>

      <View style={{ gap: spacing.lg }}>
        <Headline text={ins.headline} />

        <View style={styles.scoreRow}>
          <ScoreCard label={my.analytics.growthScore} score={ins.growthScore} />
          <ScoreCard label={my.analytics.marketScore} score={ins.marketScore} />
        </View>

        <RiskCard level={ins.riskLevel} reason={ins.riskReason} />

        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <SectionNavCard
            icon="chart-line"
            iconColor={colors.accent.base}
            title={my.analytics.sectionTrend}
            preview={my.analytics.sectionTrendPreview}
            onPress={() => router.push("/analytics/trend")}
          />
          <SectionNavCard
            icon="bulb"
            iconColor={colors.semantic.positive}
            title={my.analytics.swot}
            preview={my.analytics.sectionSwotPreview(
              swotCounts.s,
              swotCounts.w,
              swotCounts.o,
              swotCounts.t
            )}
            onPress={() => router.push("/analytics/swot")}
          />
          <SectionNavCard
            icon="profile"
            iconColor={colors.chart.dustyRose}
            title={my.analytics.segments}
            preview={my.analytics.sectionSegmentsPreview(segmentCount)}
            onPress={() => router.push("/analytics/segments")}
          />
          <SectionNavCard
            icon="sparkles"
            iconColor={colors.accent.base}
            title={my.analytics.recommendations}
            preview={my.analytics.sectionRecsPreview}
            onPress={() => router.push("/analytics/recommendations")}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["3xl"],
  },
  scoreRow: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  generateCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.pinnedCard,
    padding: spacing["4xl"],
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: "center",
    gap: spacing.lg,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bg.iconSoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
