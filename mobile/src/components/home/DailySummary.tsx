import { View, StyleSheet } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { spacing } from "@/theme/tokens";
import { formatCurrency } from "@/lib/format";
import { my } from "@/i18n/my";

interface Props {
  todaySalesMmk: number;
  yesterdaySalesMmk: number;
  weekSalesMmk?: number;
  monthRevenueMmk?: number;
}

function deltaLine(today: number, yesterday: number): string {
  if (yesterday <= 0) return "";
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  if (pct > 0) return my.home.deltaUp(pct);
  if (pct < 0) return my.home.deltaDown(Math.abs(pct));
  return my.home.deltaSame;
}

export function DailySummary({ todaySalesMmk, yesterdaySalesMmk, weekSalesMmk = 0, monthRevenueMmk = 0 }: Props) {
  let headline: string;
  let sub = "";

  if (todaySalesMmk > 0) {
    headline = my.home.todaySold(formatCurrency(todaySalesMmk));
    sub = deltaLine(todaySalesMmk, yesterdaySalesMmk);
  } else if (weekSalesMmk > 0) {
    // weekSold / monthContext may be undefined on old bundles — fall back safely
    headline = my.home.weekSold
      ? my.home.weekSold(formatCurrency(weekSalesMmk))
      : `${formatCurrency(weekSalesMmk)} (7 days)`;
    sub = monthRevenueMmk > 0 && my.home.monthContext
      ? my.home.monthContext(formatCurrency(monthRevenueMmk))
      : "";
  } else if (monthRevenueMmk > 0) {
    headline = my.home.monthContext
      ? my.home.monthContext(formatCurrency(monthRevenueMmk))
      : `${formatCurrency(monthRevenueMmk)} (30 days)`;
  } else {
    headline = my.home.noSalesYet;
  }

  return (
    <View style={styles.wrap}>
      <AppText variant="subhead" color="primary">{headline}</AppText>
      {sub ? (
        <AppText variant="caption" color="secondary" style={{ marginTop: spacing.xs }}>{sub}</AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
});
