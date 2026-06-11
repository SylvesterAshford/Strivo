"use client";

import { View, StyleSheet } from "@/rn";
import { AppText } from "@/components/ui/AppText";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { colors, spacing, radius, type } from "@/theme/tokens";
import { formatCurrencyParts, formatPeriodMonth } from "@/lib/format";

interface Props {
  salesMmk: number;
  expensesMmk: number;
  netMmk: number;
  /** Reviewed month "YYYY-MM" — matches Home's advisor.periodMonth. */
  periodMonth?: string;
}

// The scan-first row of the report: one composed surface, three serif figures
// (income / expenses / net) side by side on desktop. Replaces the old
// label/value list card that read like a settings row.
function Stat({ label, value, valueColor }: { label: string; value: number; valueColor?: string }) {
  const { value: figure, unit } = formatCurrencyParts(value);
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <AppText style={{ ...type.serifLg, color: valueColor ?? colors.text.primary, lineHeight: 1.1 }}>
          {figure}
        </AppText>
        <AppText style={{ ...type.serifUnit, color: colors.text.secondary, marginLeft: 6, marginBottom: 3, lineHeight: 1 }}>
          {unit}
        </AppText>
      </View>
    </View>
  );
}

export function MonthSummary({ salesMmk, expensesMmk, netMmk, periodMonth }: Props) {
  const netColor = netMmk >= 0 ? colors.semantic.positive : colors.semantic.critical;

  return (
    <View style={styles.card}>
      <Eyebrow style={{ marginBottom: spacing.xl }}>{periodMonth ? formatPeriodMonth(periodMonth) : "MONTH"}</Eyebrow>
      <div className="stat-band">
        <Stat label="ဝင်ငွေ" value={salesMmk} />
        <Stat label="ကုန်ကျ" value={expensesMmk} />
        <Stat label="အမြတ်" value={netMmk} valueColor={netColor} />
      </div>
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
});
