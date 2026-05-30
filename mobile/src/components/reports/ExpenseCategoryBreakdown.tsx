import { View, StyleSheet } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { colors, spacing, radius } from "@/theme/tokens";
import { formatCurrency } from "@/lib/format";
import { my } from "@/i18n/my";
import type { ReportExpenseCategory } from "@/lib/api";

interface Props {
  categories: ReportExpenseCategory[];
}

const PALETTE = [
  colors.chart.terracotta,
  colors.chart.dustyBlue,
  colors.chart.sage,
  colors.chart.plum,
];

/**
 * Stacked bar of this-month expense spending broken down by category.
 * Categories without explicit names are bucketed under "Other".
 */
export function ExpenseCategoryBreakdown({ categories }: Props) {
  const cleaned = categories
    .filter((c) => c.totalMmk > 0)
    .map((c) => ({ ...c, category: c.category || my.reports.expenseUncategorized }));
  if (cleaned.length === 0) return null;

  const max = Math.max(...cleaned.map((c) => c.totalMmk), 1);

  return (
    <View style={styles.card}>
      <Eyebrow style={{ marginBottom: spacing.lg }}>EXPENSES</Eyebrow>
      <AppText variant="title" style={{ marginBottom: spacing.md }}>
        {my.reports.expenseBreakdownTitle}
      </AppText>
      <View style={{ gap: spacing.md }}>
        {cleaned.map((c, i) => (
          <View key={`${c.category}-${i}`}>
            <View style={styles.labelRow}>
              <AppText variant="bodyMedium" numberOfLines={1} style={{ flex: 1, marginRight: spacing.sm }}>
                {c.category}
              </AppText>
              <AppText variant="caption" color="secondary">
                {formatCurrency(c.totalMmk)} · {my.reports.txCount(c.count)}
              </AppText>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${(c.totalMmk / max) * 100}%`,
                    backgroundColor: PALETTE[i % PALETTE.length],
                  },
                ]}
              />
            </View>
          </View>
        ))}
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
