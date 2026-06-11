"use client";

import { View, StyleSheet } from "@/rn";
import { AppText } from "@/components/ui/AppText";
import { colors, spacing, radius } from "@/theme/tokens";
import { formatCurrency } from "@/lib/format";
import { my } from "@/i18n/my";
import type { ReportTopCustomer } from "@/lib/api";

interface Props {
  customers: ReportTopCustomer[];
}

export function TopCustomers({ customers }: Props) {
  if (customers.length === 0) return null;
  const max = Math.max(...customers.map((c) => c.totalMmk), 1);

  return (
    <View style={styles.card}>
      {/* One heading per card — the Burmese title IS the heading (English
          mono eyebrows double-headed every card and added noise). */}
      <AppText variant="title" style={{ marginBottom: spacing.lg }}>
        {my.reports.topCustomers}
      </AppText>
      <View style={{ gap: spacing.md }}>
        {customers.map((c, i) => (
          <View key={`${c.name}-${i}`} style={styles.row}>
            <View style={styles.rank}>
              <AppText variant="caption" color="tertiary">
                {i + 1}
              </AppText>
            </View>
            <View style={styles.body}>
              <View style={styles.labelRow}>
                <AppText variant="bodyMedium" numberOfLines={1} style={styles.name}>
                  {c.name}
                </AppText>
                <AppText variant="bodyMedium">{formatCurrency(c.totalMmk)}</AppText>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(c.totalMmk / max) * 100}%` }]} />
              </View>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rank: {
    width: 20,
    alignItems: "center",
  },
  body: {
    flex: 1,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  name: {
    flex: 1,
    marginRight: spacing.sm,
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
    backgroundColor: colors.chart.plum,
  },
});
