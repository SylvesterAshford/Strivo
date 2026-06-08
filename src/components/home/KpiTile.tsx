"use client";

import { View } from "@/rn";
import { AppText } from "@/components/ui/AppText";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { colors, spacing, radius } from "@/theme/tokens";
import { formatCurrency } from "@/lib/format";

// Compact KPI tile for the Home dashboard row (week / month / outstanding).
// Mono eyebrow, serif figure, Burmese label — the secondary metrics that sit
// under the hero number.
export function KpiTile({ eyebrow, label, amountMmk }: { eyebrow: string; label: string; amountMmk: number }) {
  return (
    <View
      className="lift"
      style={{
        backgroundColor: colors.bg.surface,
        borderRadius: radius.pinnedCard,
        borderWidth: 1,
        borderColor: colors.border.default,
        padding: spacing.xl,
        gap: spacing.xs,
      }}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <AppText variant="serifLg" color="primary" style={{ lineHeight: 1.1, marginTop: 2 }}>
        {formatCurrency(amountMmk)}
      </AppText>
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
    </View>
  );
}
