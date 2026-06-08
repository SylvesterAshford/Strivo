"use client";

import { View, StyleSheet } from "@/rn";
import { AppText } from "@/components/ui/AppText";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { colors, spacing, radius } from "@/theme/tokens";
import { formatCurrency } from "@/lib/format";

interface Props {
  salesMmk: number;
  expensesMmk: number;
  netMmk: number;
}

function StatRow({ label, value, valueColor }: { label: string; value: number; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="body" color="secondary">
        {label}
      </AppText>
      <AppText variant="bodyMedium" style={valueColor ? { color: valueColor } : undefined}>
        {formatCurrency(value)}
      </AppText>
    </View>
  );
}

export function MonthSummary({ salesMmk, expensesMmk, netMmk }: Props) {
  const netColor = netMmk >= 0 ? colors.semantic.positive : colors.semantic.critical;

  return (
    <View style={styles.card}>
      <Eyebrow style={{ marginBottom: spacing.lg }}>MONTH</Eyebrow>
      <StatRow label="ဝင်ငွေ" value={salesMmk} />
      <View style={styles.divider} />
      <StatRow label="ကုန်ကျ" value={expensesMmk} />
      <View style={styles.divider} />
      <StatRow label="အမြတ်" value={netMmk} valueColor={netColor} />
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.hairline,
  },
});
