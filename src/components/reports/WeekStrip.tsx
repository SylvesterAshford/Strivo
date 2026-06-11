"use client";

import { View, StyleSheet } from "@/rn";
import { AppText } from "@/components/ui/AppText";
import { colors, spacing, radius } from "@/theme/tokens";
import { formatCurrency } from "@/lib/format";
import { my } from "@/i18n/my";
import type { WeekDay } from "@/lib/api";

const BAR_HEIGHT = 72; // max bar height in px
const MIN_BAR = 4; // always show a sliver even when value = 0

interface Props {
  days: WeekDay[];
}

export function WeekStrip({ days }: Props) {
  const maxVal = Math.max(...days.flatMap((d) => [d.salesMmk, d.expensesMmk]), 1);

  function barHeight(value: number): number {
    return Math.max(MIN_BAR, (value / maxVal) * BAR_HEIGHT);
  }

  // Today is always the last entry
  const todayIdx = days.length - 1;

  return (
    <View style={styles.card}>
      <AppText variant="title" style={{ marginBottom: spacing.lg }}>
        {my.reports.weekTitle}
      </AppText>

      <View style={styles.chart}>
        {days.map((day, i) => {
          const isToday = i === todayIdx;
          return (
            <View key={day.label} style={styles.dayCol}>
              {/* Bars container — bottom-aligned */}
              <View style={[styles.barsWrap, { height: BAR_HEIGHT }]}>
                <View style={styles.barPair}>
                  {/* Sales bar */}
                  <View
                    className="bar-enter"
                    style={[styles.bar, { height: barHeight(day.salesMmk), backgroundColor: isToday ? colors.accent.base : colors.bg.track }]}
                  />
                  {/* Expenses bar */}
                  {day.expensesMmk > 0 && (
                    <View
                      className="bar-enter"
                      style={[
                        styles.bar,
                        { height: barHeight(day.expensesMmk), backgroundColor: isToday ? colors.semantic.caution : colors.border.default },
                      ]}
                    />
                  )}
                </View>
              </View>

              {/* Day label */}
              <AppText
                variant="caption"
                color={isToday ? "accent" : "tertiary"}
                style={[styles.dayLabel, isToday && styles.dayLabelToday]}
              >
                {day.label === "TODAY" ? "NOW" : day.label}
              </AppText>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent.base }]} />
          <AppText variant="caption" color="secondary">
            {formatCurrency(days[todayIdx].salesMmk)}
          </AppText>
        </View>
        {days[todayIdx].expensesMmk > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.semantic.caution }]} />
            <AppText variant="caption" color="secondary">
              {formatCurrency(days[todayIdx].expensesMmk)}
            </AppText>
          </View>
        )}
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
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  dayCol: {
    flex: 1,
    alignItems: "center",
  },
  barsWrap: {
    justifyContent: "flex-end",
    width: "100%",
    alignItems: "center",
  },
  barPair: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    width: "100%",
    justifyContent: "center",
  },
  bar: {
    width: 8,
    borderRadius: 4,
  },
  dayLabel: {
    marginTop: spacing.xs,
    fontSize: 9,
  },
  dayLabelToday: {
    fontFamily: "Inter-Medium",
  },
  legend: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
