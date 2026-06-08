"use client";

import { View, StyleSheet } from "@/rn";
import { AppText } from "@/components/ui/AppText";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { colors, spacing, radius } from "@/theme/tokens";
import { formatCurrency } from "@/lib/format";
import { useCountUp } from "@/lib/use-count-up";
import { my, eyebrows } from "@/i18n/my";
import type { HeroMetric as HeroMetricKey } from "@/stores/profile";

interface Props {
  metric: HeroMetricKey;
  amountMmk: number;
}

const META: Record<HeroMetricKey, { eyebrow: string; label: string }> = {
  today_sales: { eyebrow: eyebrows.today, label: my.heroMetric.todaySales },
  week_sales: { eyebrow: eyebrows.week, label: my.heroMetric.weekSales },
  month_revenue: { eyebrow: eyebrows.revenue, label: my.heroMetric.monthRevenue },
  outstanding: { eyebrow: eyebrows.outstanding, label: my.heroMetric.outstanding },
};

export function HeroMetric({ metric, amountMmk }: Props) {
  const meta = META[metric];
  const animated = useCountUp(amountMmk);
  return (
    <View style={styles.card}>
      <Eyebrow style={{ marginBottom: spacing.sm }}>{meta.eyebrow}</Eyebrow>
      <AppText variant="serifDisplay" color="primary" style={styles.amount}>
        {formatCurrency(Math.round(animated))}
      </AppText>
      <AppText variant="caption" color="secondary" style={{ marginTop: spacing.xs }}>
        {meta.label}
      </AppText>
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
    alignItems: "flex-start",
  },
  amount: {
    letterSpacing: -1,
    lineHeight: 1.1,
  },
});
