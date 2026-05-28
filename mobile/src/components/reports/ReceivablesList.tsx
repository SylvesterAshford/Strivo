import { View, StyleSheet } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { colors, spacing, radius } from "@/theme/tokens";
import { formatCurrency } from "@/lib/format";
import type { ReportsData } from "@/lib/api";

type Receivable = ReportsData["receivables"][number];

function ReceivableRow({ item }: { item: Receivable }) {
  const date = new Date(item.occurredAt);
  const dateStr = `${date.getDate()}/${date.getMonth() + 1}`;
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <AppText variant="bodyMedium" numberOfLines={1}>
          {item.counterparty || item.description}
        </AppText>
        {item.counterparty ? (
          <AppText variant="caption" color="secondary" numberOfLines={1}>
            {item.description}
          </AppText>
        ) : null}
      </View>
      <View style={styles.rowRight}>
        {item.amountMmk ? (
          <AppText variant="bodyMedium" style={{ color: colors.semantic.caution }}>
            {formatCurrency(item.amountMmk)}
          </AppText>
        ) : null}
        <AppText variant="caption" color="tertiary">
          {dateStr}
        </AppText>
      </View>
    </View>
  );
}

interface Props {
  receivables: Receivable[];
}

export function ReceivablesList({ receivables }: Props) {
  if (receivables.length === 0) return null;

  const totalMmk = receivables.reduce((s, r) => s + (r.amountMmk ?? 0), 0);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Eyebrow>OUTSTANDING</Eyebrow>
        <AppText variant="bodyMedium" style={{ color: colors.semantic.caution }}>
          {formatCurrency(totalMmk)}
        </AppText>
      </View>
      {receivables.map((r, i) => (
        <View key={r.id}>
          {i > 0 && <View style={styles.divider} />}
          <ReceivableRow item={r} />
        </View>
      ))}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  rowRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.hairline,
  },
});
