import { useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  // Auto-trigger if insights are already cached (user previously generated
  // them — no need to show the generate card again on revisit).
  const [triggered, setTriggered] = useState(() => {
    return queryClient.getQueryData(["insights"]) != null;
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["insights"],
    queryFn: fetchInsights,
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    enabled: triggered,
  });

  // Initial state — show the Generate card.
  if (!triggered) {
    const features = [
      { icon: "chart-line" as const, label: my.analytics.generateFeatureTrend },
      { icon: "bulb" as const, label: my.analytics.generateFeatureSwot },
      { icon: "profile" as const, label: my.analytics.generateFeatureSegments },
      { icon: "sparkles" as const, label: my.analytics.generateFeatureRecs },
    ];
    return (
      <Screen>
        <AppText variant="subhead" style={{ marginBottom: spacing.lg }}>
          {my.analytics.title}
        </AppText>
        <View style={styles.generateCard}>
          <View style={styles.generateHeader}>
            <View style={styles.headerIcon}>
              <Icon name="sparkles" size={20} color={colors.accent.base} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="monoEyebrow" color="tertiary">
                {my.analytics.generateEyebrow}
              </AppText>
              <AppText variant="subhead" color="primary" style={{ marginTop: 2 }}>
                {my.analytics.generateTitle}
              </AppText>
            </View>
          </View>

          <AppText variant="body" color="secondary" style={{ marginTop: spacing.md }}>
            {my.analytics.generateBody}
          </AppText>

          <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
            {features.map((f) => (
              <View key={f.label} style={styles.featureRow}>
                <Icon name={f.icon} size={16} color={colors.accent.base} />
                <AppText variant="body" color="primary" style={{ flex: 1 }}>
                  {f.label}
                </AppText>
              </View>
            ))}
          </View>

          <View style={{ marginTop: spacing["2xl"] }}>
            <Button label={my.analytics.generateCta} onPress={() => setTriggered(true)} />
          </View>
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
            <Icon name="spreadsheet" size={26} color={colors.accent.base} />
          </View>
          <AppText variant="subhead" color="primary" style={{ textAlign: "center" }}>
            {my.analytics.emptyHeadline}
          </AppText>
          <AppText variant="body" color="secondary" style={{ textAlign: "center" }}>
            {my.analytics.emptyBody}
          </AppText>
          <View style={{ alignSelf: "stretch" }}>
            <Button label={my.addData.title} onPress={() => router.push("/record")} />
          </View>
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
    padding: spacing["3xl"],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  generateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.iconContainer,
    backgroundColor: colors.accent.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  // Empty-state (no data yet) variant keeps the centered icon treatment.
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bg.iconSoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
});
