"use client";

import { View, StyleSheet } from "@/rn";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { colors, spacing, radius } from "@/theme/tokens";
import { formatCurrency, formatPeriodMonth } from "@/lib/format";
import type { AdvisorHome } from "@/lib/api";

// Insights context line — NOT Home's verdict card. Same reconciled numbers as
// Home (from deriveAdvisor), rendered as one compact strip so Insights doesn't
// duplicate Home's hero. The depth cards (receivables, recommendations, scenario)
// lead below it. Tappable → the month's transactions (traceable).
export function ProfitStrip({ advisor }: { advisor: AdvisorHome }) {
  const profit = advisor.snapshot.profitMmk;
  const profitColor = profit >= 0 ? colors.semantic.positive : colors.semantic.critical;

  return (
    <View style={styles.strip}>
      <View style={{ flex: 1 }}>
        <AppText variant="monoEyebrow" color="tertiary">
          {formatPeriodMonth(advisor.periodMonth)}
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: spacing.sm, marginTop: 2 }}>
          <AppText variant="bodyMedium" style={{ color: profitColor }}>
            {formatCurrency(profit)}
          </AppText>
          <AppText variant="caption" color="tertiary">
            အမြတ် · ရောင်းအား {formatCurrency(advisor.snapshot.salesMmk)}
          </AppText>
        </View>
      </View>
      <Icon name="chevron-right" size={16} color={colors.text.tertiary} />
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.attentionCard,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});
