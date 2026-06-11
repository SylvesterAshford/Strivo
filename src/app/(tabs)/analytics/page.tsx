"use client";

import { View, Pressable, StyleSheet } from "@/rn";
import { useRouter } from "@/rn/router";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "@/components/layout/Screen";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ProfitStrip } from "@/components/analytics/ProfitStrip";
import { ReceivablesList } from "@/components/reports/ReceivablesList";
import { SectionNavCard } from "@/components/analytics/SectionNavCard";
import { UnlockNext } from "@/components/app/UnlockNext";
import { QueryError } from "@/components/layout/QueryError";
import { Skeleton } from "@/components/layout/Skeleton";
import { fetchInsights } from "@/lib/api";
import { colors, spacing, radius } from "@/theme/tokens";
import { my } from "@/i18n/my";

// Analytics = finance tool, not report card. Deterministic cards first (money
// summary + why-profit-moved via the shared advisor, who-owes-you), reconciled
// with Home/Reports. Growth/market scores and SWOT are gone. The LLM only powers
// recommendations + scenarios, which load in the background.
export default function AnalyticsOverview() {
  const router = useRouter();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["insights"],
    queryFn: fetchInsights,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const titleRow = (
    <View style={styles.titleRow}>
      <AppText variant="subhead">{my.analytics.title}</AppText>
      <Button label={my.scenarios.title} variant="secondary" onPress={() => router.push("/analytics/scenarios")} />
    </View>
  );

  if (isError && !data) {
    return (
      <Screen>
        <AppText variant="subhead" style={{ marginBottom: spacing.lg }}>{my.analytics.title}</AppText>
        <QueryError onRetry={() => void refetch()} />
      </Screen>
    );
  }

  if (isLoading && !data) {
    return (
      <Screen>
        <AppText variant="subhead" style={{ marginBottom: spacing.lg }}>{my.analytics.title}</AppText>
        <View style={{ gap: spacing.lg }}>
          <Skeleton height={64} style={{ borderRadius: 12 }} />
          <Skeleton height={140} style={{ borderRadius: 14 }} />
        </View>
      </Screen>
    );
  }

  // No sale/expense data and no receivables — nothing to analyze yet.
  if (!data || data.ready === false) {
    return (
      <Screen>
        <AppText variant="subhead" style={{ marginBottom: spacing.lg }}>{my.analytics.title}</AppText>
        <View style={styles.emptyCard}>
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

  const { advisor, receivables } = data.analytics;
  const hasRecs = data.insights != null;

  return (
    <Screen contentStyle={{ maxWidth: 640 }}>
      {titleRow}
      <View style={{ gap: spacing.lg }}>
        {/* Context strip — same reconciled numbers as Home, but NOT Home's verdict
            card. The verdict (health + why-profit-moved + actions) lives on Home;
            Insights is the depth layer. Tappable → this month's transactions. */}
        {advisor ? (
          <Pressable onPress={() => router.push(`/transactions?month=${advisor.periodMonth}`)}>
            <ProfitStrip advisor={advisor} />
          </Pressable>
        ) : null}

        {/* Who owes you — oldest first. Tappable → all receivables. */}
        {receivables.length > 0 ? (
          <Pressable onPress={() => router.push("/transactions?kind=receivable")}>
            <ReceivablesList receivables={receivables} />
          </Pressable>
        ) : null}

        {/* One recruiting card max — names the highest-value missing input. */}
        <UnlockNext />

        {/* Recommendations — LLM, loads in background. */}
        {hasRecs ? (
          <SectionNavCard
            icon="sparkles"
            iconColor={colors.accent.base}
            title={my.analytics.recommendations}
            preview={my.analytics.sectionRecsPreview}
            onPress={() => router.push("/analytics/recommendations")}
          />
        ) : (
          <View style={styles.prepCard}>
            <Icon name="sparkles" size={16} color={colors.text.tertiary} />
            <AppText variant="caption" color="secondary">
              {my.analytics.analyzing}
            </AppText>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  emptyCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.pinnedCard,
    padding: spacing["3xl"],
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: spacing.md,
  },
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
  prepCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.attentionCard,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.lg,
  },
});
