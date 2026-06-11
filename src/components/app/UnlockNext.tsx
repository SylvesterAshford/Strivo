"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { View, Pressable } from "@/rn";
import { useRouter } from "@/rn/router";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { useProfile } from "@/stores/profile";
import { fetchReports } from "@/lib/api";
import { colors, spacing, radius } from "@/theme/tokens";
import { my } from "@/i18n/my";

// The "unlock next" slot (CEO plan 2026-06-11, D3): each tab shows AT MOST ONE
// recruiting card naming the highest-value input the workspace has never
// provided, with a one-tap CTA to the matching import screen. This is the
// antidote to the data-gating death spiral — hidden cards stay hidden, but the
// app says what would light them up.
//
// Priority: expenses first (profit accuracy beats everything), then products
// vs counterparties ordered by businessType — the ONLY thing businessType is
// allowed to influence outside AI language (input contract rule).

type UnlockKey = "expenses" | "products" | "counterparties";

const ROUTE: Record<UnlockKey, "/import-expenses" | "/import-sales"> = {
  expenses: "/import-expenses",
  products: "/import-sales",
  counterparties: "/import-sales",
};

function dismissKey(month: string, key: UnlockKey): string {
  return `${month}:${key}`;
}

function readDismissed(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("strivo-unlock-dismissed");
}

export function UnlockNext() {
  const router = useRouter();
  const businessType = useProfile((s) => s.businessType);
  const [dismissed, setDismissed] = useState<string | null>(readDismissed);

  // Shares the reports query cache — zero extra requests when the Reports tab
  // has loaded; one cached fetch otherwise.
  const { data } = useQuery({ queryKey: ["reports"], queryFn: fetchReports, staleTime: 300_000 });
  if (!data) return null;

  const { coverage } = data;
  const month = data.month.periodMonth;

  // b2b/services live on client relationships; retail/fnb on products.
  const relationshipFirst = businessType === "b2b_trading" || businessType === "services";
  const order: UnlockKey[] = relationshipFirst
    ? ["expenses", "counterparties", "products"]
    : ["expenses", "products", "counterparties"];

  const missing: Record<UnlockKey, boolean> = {
    expenses: !coverage.hasExpenses,
    products: !coverage.hasProducts,
    counterparties: !coverage.hasCounterparties,
  };
  const next = order.find((k) => missing[k]);
  if (!next) return null;
  if (dismissed === dismissKey(month, next)) return null;

  const copy = my.unlock[next];

  const onDismiss = () => {
    const key = dismissKey(month, next);
    window.localStorage.setItem("strivo-unlock-dismissed", key);
    setDismissed(key);
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: spacing.md,
        backgroundColor: colors.bg.surface,
        borderRadius: radius.pinnedCard,
        borderWidth: 1,
        borderColor: colors.identity.border,
        padding: spacing.xl,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.iconContainer,
          backgroundColor: colors.identity.soft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="bulb" size={18} color={colors.identity.purple} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyMedium">{copy.title}</AppText>
        <AppText variant="caption" color="secondary">
          {copy.body}
        </AppText>
        <Pressable onPress={() => router.push(ROUTE[next])} style={{ marginTop: spacing.sm, alignSelf: "flex-start" }}>
          <AppText variant="bodyMedium" style={{ color: colors.identity.purple }}>
            {copy.cta} →
          </AppText>
        </Pressable>
      </View>
      <Pressable accessibilityLabel={my.common.cancel} onPress={onDismiss} style={{ padding: 4 }}>
        <Icon name="x" size={16} color={colors.text.tertiary} />
      </Pressable>
    </View>
  );
}
