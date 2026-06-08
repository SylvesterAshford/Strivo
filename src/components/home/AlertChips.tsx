"use client";

import { View, StyleSheet } from "@/rn";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { colors, spacing, radius } from "@/theme/tokens";
import { formatCurrency } from "@/lib/format";
import { my } from "@/i18n/my";

interface Props {
  outstandingMmk: number;
  todaySalesMmk: number;
  todayExpensesMmk: number;
}

interface ChipData {
  key: string;
  label: string;
  tone: "caution" | "critical";
}

export function AlertChips({ outstandingMmk, todaySalesMmk, todayExpensesMmk }: Props) {
  const chips: ChipData[] = [];

  if (outstandingMmk > 0) {
    chips.push({ key: "outstanding", label: my.home.alertOutstanding(formatCurrency(outstandingMmk)), tone: "caution" });
  }
  if (todayExpensesMmk > todaySalesMmk && todayExpensesMmk > 0) {
    chips.push({ key: "expense", label: my.home.alertExpenseHigh, tone: "critical" });
  }

  if (chips.length === 0) return null;

  return (
    <View style={styles.row}>
      {chips.map((chip) => {
        const color = chip.tone === "critical" ? colors.semantic.critical : colors.semantic.caution;
        return (
          <View key={chip.key} style={[styles.chip, { borderColor: color }]}>
            <Icon name="alert-triangle" size={14} color={color} />
            <AppText variant="caption" style={{ color, marginLeft: spacing.xs }}>
              {chip.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.attentionCard,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
});
