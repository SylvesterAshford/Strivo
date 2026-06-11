"use client";

import { View, StyleSheet } from "@/rn";
import { AppText } from "@/components/ui/AppText";
import { colors, spacing, radius } from "@/theme/tokens";
import { formatCurrency } from "@/lib/format";
import { my } from "@/i18n/my";
import type { ReportTopProduct } from "@/lib/api";

// Gated card (input contract): renders only when ≥1 sale this month carries a
// structured productName. Answers retail/F&B's #1 question — what sells best.
export function TopProducts({ products }: { products: ReportTopProduct[] }) {
  if (products.length === 0) return null;
  const max = Math.max(...products.map((p) => p.totalMmk), 1);

  return (
    <View style={styles.card}>
      <AppText variant="title" style={{ marginBottom: spacing.lg }}>
        {my.reports.topProducts}
      </AppText>
      <View style={{ gap: spacing.md }}>
        {products.map((p, i) => (
          <View key={`${p.name}-${i}`} style={styles.row}>
            <View style={styles.rank}>
              <AppText variant="caption" color="tertiary">
                {i + 1}
              </AppText>
            </View>
            <View style={styles.body}>
              <View style={styles.labelRow}>
                <AppText variant="bodyMedium" numberOfLines={1} style={styles.name}>
                  {p.name}
                </AppText>
                <AppText variant="bodyMedium">{formatCurrency(p.totalMmk)}</AppText>
              </View>
              {p.units > 0 ? (
                <AppText variant="caption" color="tertiary">
                  {my.reports.unitsSold(p.units)}
                </AppText>
              ) : null}
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(p.totalMmk / max) * 100}%` }]} />
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
  row: { flexDirection: "row", alignItems: "flex-start" },
  rank: { width: 22, paddingTop: 2 },
  body: { flex: 1, gap: 4 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  name: { flex: 1 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.bg.elevated, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.chart.plum },
});
