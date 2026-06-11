"use client";

import { View, StyleSheet } from "@/rn";
import { AppText } from "@/components/ui/AppText";
import { colors, spacing, radius } from "@/theme/tokens";
import { formatCurrency } from "@/lib/format";
import { my } from "@/i18n/my";
import type { ReportCategory } from "@/lib/api";

interface Props {
  categories: ReportCategory[];
}

const META: Record<ReportCategory["kind"], { label: string; color: string }> = {
  sale: { label: my.reports.kindSale, color: colors.chart.plum },
  expense: { label: my.reports.kindExpense, color: colors.chart.terracotta },
  receivable: { label: my.reports.kindReceivable, color: colors.chart.dustyBlue },
  note: { label: my.reports.kindNote, color: colors.chart.sage },
};

export function CategoryBreakdown({ categories }: Props) {
  const shown = categories.filter((c) => c.totalMmk > 0);
  // Gate (input contract): a one-bar chart compares nothing. Hide until
  // there are ≥2 kinds with money in them.
  if (shown.length < 2) return null;
  const max = Math.max(...shown.map((c) => c.totalMmk), 1);

  return (
    <View style={styles.card}>
      <AppText variant="title" style={{ marginBottom: spacing.lg }}>
        {my.reports.categoryBreakdown}
      </AppText>
      <View style={{ gap: spacing.md }}>
        {shown.map((c) => {
          const meta = META[c.kind];
          return (
            <View key={c.kind}>
              <View style={styles.labelRow}>
                <AppText variant="bodyMedium">{meta.label}</AppText>
                <AppText variant="caption" color="secondary">
                  {formatCurrency(c.totalMmk)} · {my.reports.txCount(c.count)}
                </AppText>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(c.totalMmk / max) * 100}%`, backgroundColor: meta.color }]} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.pinnedCard,
    padding: spacing["3xl"],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bg.track,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
});
