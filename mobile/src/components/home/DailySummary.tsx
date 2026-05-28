import { View, StyleSheet } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { spacing } from "@/theme/tokens";
import { formatCurrency } from "@/lib/format";
import { my } from "@/i18n/my";

interface Props {
  todaySalesMmk: number;
  yesterdaySalesMmk: number;
}

function deltaLine(today: number, yesterday: number): string {
  if (yesterday <= 0) return "";
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  if (pct > 0) return my.home.deltaUp(pct);
  if (pct < 0) return my.home.deltaDown(Math.abs(pct));
  return my.home.deltaSame;
}

export function DailySummary({ todaySalesMmk, yesterdaySalesMmk }: Props) {
  const headline =
    todaySalesMmk > 0 ? my.home.todaySold(formatCurrency(todaySalesMmk)) : my.home.noSalesYet;
  const delta = todaySalesMmk > 0 ? deltaLine(todaySalesMmk, yesterdaySalesMmk) : "";

  return (
    <View style={styles.wrap}>
      <AppText variant="subhead" color="primary">
        {headline}
      </AppText>
      {delta ? (
        <AppText variant="caption" color="secondary" style={{ marginTop: spacing.xs }}>
          {delta}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
});
