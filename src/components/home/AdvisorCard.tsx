"use client";

import { View, Pressable } from "@/rn";
import { useRouter } from "@/rn/router";
import { AppText } from "@/components/ui/AppText";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SerifMetric } from "@/components/ui/SerifMetric";
import { Icon } from "@/components/ui/Icon";
import { colors, spacing, radius } from "@/theme/tokens";
import { formatCurrency, formatCurrencyParts, formatPeriodMonth } from "@/lib/format";
import { useCountUp } from "@/lib/use-count-up";
import type { AdvisorHome, BusinessHealthStatus } from "@/lib/api";

const STATUS_COLOR: Record<BusinessHealthStatus, string> = {
  good: colors.semantic.positive,
  watch: colors.semantic.caution,
  at_risk: colors.semantic.critical,
};

// The Monthly Profit Review card — the new Home centerpiece. Health status,
// profit snapshot for the reviewed month, and the deterministic "why it changed".
export function AdvisorCard({ advisor }: { advisor: AdvisorHome }) {
  const router = useRouter();
  const statusColor = STATUS_COLOR[advisor.health.status];
  const profit = advisor.snapshot.profitMmk;
  const profitColor = profit >= 0 ? colors.semantic.positive : colors.semantic.critical;
  const animatedProfit = useCountUp(profit);

  return (
    <View
      style={{
        backgroundColor: colors.bg.surface,
        borderRadius: radius.pinnedCard,
        borderWidth: 1,
        borderColor: colors.border.default,
        padding: spacing["3xl"],
        gap: spacing.lg,
      }}
    >
      {/* Period + update CTA */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Eyebrow>{formatPeriodMonth(advisor.periodMonth)}</Eyebrow>
        <Pressable
          onPress={() => router.push("/record")}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          accessibilityLabel="Update data"
        >
          <Icon name="plus" size={14} color={colors.accent.base} />
          <AppText variant="caption" color="accent">
            ဒေတာ ထည့်မည်
          </AppText>
        </Pressable>
      </View>

      {/* Health status word + explanation */}
      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: statusColor }} />
          <AppText variant="subhead" style={{ color: statusColor }}>
            {advisor.health.title}
          </AppText>
        </View>
        <AppText variant="body" color="secondary">
          {advisor.health.explanation}
        </AppText>
      </View>

      {/* Profit snapshot — profit is the hero */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.border.hairline,
          paddingTop: spacing.lg,
          gap: spacing.xs,
        }}
      >
        <Eyebrow>အမြတ်</Eyebrow>
        <SerifMetric
          value={formatCurrencyParts(Math.round(animatedProfit)).value}
          unit={formatCurrencyParts(Math.round(animatedProfit)).unit}
          size="display"
        />
        {/* lineHeight pinned on both values: Burmese units (သိန်း) get a taller
            fallback-font line box than Latin "Ks", which drifts the baselines
            between columns without an explicit shared height. */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing["3xl"], marginTop: spacing.sm }}>
          <View>
            <AppText variant="caption" color="tertiary">
              ရောင်းအား
            </AppText>
            <AppText variant="bodyMedium" color="primary" style={{ lineHeight: 24 }}>
              {formatCurrency(advisor.snapshot.salesMmk)}
            </AppText>
          </View>
          <View>
            <AppText variant="caption" color="tertiary">
              ကုန်ကျ
            </AppText>
            <AppText
              variant="bodyMedium"
              style={{
                lineHeight: 24,
                color: profitColor === colors.semantic.critical ? colors.semantic.critical : colors.text.primary,
              }}
            >
              {formatCurrency(advisor.snapshot.expensesMmk)}
            </AppText>
          </View>
        </View>
      </View>

      {/* Why it changed */}
      {advisor.diagnosis ? (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border.hairline, paddingTop: spacing.lg, gap: spacing.xs }}>
          <Eyebrow>{advisor.diagnosis.title}</Eyebrow>
          <AppText variant="body" color="primary">
            {advisor.diagnosis.explanation}
          </AppText>
        </View>
      ) : null}

      {/* Alerts */}
      {advisor.alerts.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          {advisor.alerts.map((alert, i) => {
            const c = alert.severity === "critical" ? colors.semantic.critical : alert.severity === "warning" ? colors.semantic.caution : colors.accent.base;
            return (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: spacing.sm,
                  backgroundColor: colors.bg.elevated,
                  borderRadius: radius.attentionCard,
                  padding: spacing.md,
                }}
              >
                <View style={{ marginTop: 2 }}>
                  <Icon name="alert-triangle" size={14} color={c} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyMedium" style={{ color: c }}>
                    {alert.title}
                  </AppText>
                  <AppText variant="caption" color="secondary">
                    {alert.body}
                  </AppText>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
