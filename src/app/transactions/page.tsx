"use client";

import { useLocalSearchParams } from "@/rn/router";
import { useQuery } from "@tanstack/react-query";
import { View } from "@/rn";
import { Screen } from "@/components/layout/Screen";
import { SubHeader } from "@/components/layout/SubHeader";
import { AppText } from "@/components/ui/AppText";
import { RecentEntries } from "@/components/home/RecentEntries";
import { QueryError } from "@/components/layout/QueryError";
import { Skeleton } from "@/components/layout/Skeleton";
import { fetchTransactions } from "@/lib/api";
import { formatPeriodMonth } from "@/lib/format";
import { spacing } from "@/theme/tokens";
import { my } from "@/i18n/my";

const KIND_LABEL: Record<string, string> = {
  sale: my.reports.kindSale,
  expense: my.reports.kindExpense,
  receivable: my.reports.kindReceivable,
};

// Shared drill-down: "the transactions behind this figure." Reached from every
// Analytics/Reports card via ?month=YYYY-MM&kind=... — one screen, all figures traceable.
export default function TransactionsScreen() {
  const { month, kind } = useLocalSearchParams<{ month?: string; kind?: string }>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["transactions", month ?? "", kind ?? ""],
    queryFn: () => fetchTransactions({ month, kind }),
    staleTime: 30_000,
  });

  // Title names the filter so the owner knows what they're looking at.
  const parts = [kind ? KIND_LABEL[kind] ?? kind : null, month ? formatPeriodMonth(month) : null].filter(Boolean);
  const title = parts.length ? parts.join(" · ") : my.reports.title;

  return (
    <Screen contentStyle={{ maxWidth: 640 }}>
      <SubHeader title={title} />
      {isError && !data ? (
        <QueryError onRetry={() => void refetch()} />
      ) : isLoading && !data ? (
        <View style={{ gap: spacing.md }}>
          <Skeleton height={64} style={{ borderRadius: 12 }} />
          <Skeleton height={64} style={{ borderRadius: 12 }} />
        </View>
      ) : !data || data.entries.length === 0 ? (
        <AppText variant="body" color="secondary" style={{ marginTop: spacing.lg }}>
          {my.reports.emptyHeadline}
        </AppText>
      ) : (
        <RecentEntries entries={data.entries} label={title} />
      )}
    </Screen>
  );
}
