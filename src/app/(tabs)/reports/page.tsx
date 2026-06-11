"use client";

import { useRouter } from "@/rn/router";
import { useQuery } from "@tanstack/react-query";
import { View } from "@/rn";
import { Screen } from "@/components/layout/Screen";
import { EmptyState } from "@/components/layout/EmptyState";
import { QueryError } from "@/components/layout/QueryError";
import { SkeletonCard } from "@/components/layout/Skeleton";
import { AppText } from "@/components/ui/AppText";
import { WeekStrip } from "@/components/reports/WeekStrip";
import { MonthSummary } from "@/components/reports/MonthSummary";
import { CategoryBreakdown } from "@/components/reports/CategoryBreakdown";
import { ExpenseCategoryBreakdown } from "@/components/reports/ExpenseCategoryBreakdown";
import { TopCustomers } from "@/components/reports/TopCustomers";
import { TopProducts } from "@/components/reports/TopProducts";
import { ReceivablesList } from "@/components/reports/ReceivablesList";
import { UnlockNext } from "@/components/app/UnlockNext";
import { fetchReports } from "@/lib/api";
import { my } from "@/i18n/my";

// Title in a block wrapper: Text renders an inline <span>, so marginBottom
// directly on it is silently ignored by CSS — the gap must live on a View.
// Shared by every data state so the header never jumps.
function PageTitle() {
  return (
    <View style={{ marginBottom: 40 }}>
      <AppText variant="subhead">{my.reports.title}</AppText>
    </View>
  );
}

export default function ReportsScreen() {
  const router = useRouter();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["reports"],
    queryFn: fetchReports,
    // 5min: monthly report data barely changes within a session; skip focus
    // refetches until genuinely stale.
    staleTime: 300_000,
    refetchOnWindowFocus: true,
  });

  const hasData = data && (data.month.salesMmk > 0 || data.month.expensesMmk > 0 || data.receivables.length > 0);

  if (isError && !data) {
    return (
      <Screen>
        <PageTitle />
        <QueryError onRetry={() => void refetch()} />
      </Screen>
    );
  }

  if (isLoading && !data) {
    return (
      <Screen>
        <PageTitle />
        <View className="card-grid">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </Screen>
    );
  }

  if (!isLoading && !hasData) {
    return (
      <Screen scroll={false}>
        <EmptyState
          icon="reports"
          headline={my.reports.emptyHeadline}
          subline={my.reports.emptySubline}
          ctaLabel={my.addData.title}
          onCta={() => router.push("/record")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageTitle />

      {data && (
        <View className="report-grid">
          {/* Stat band first — the month's three figures are the headline the
              owner scans before anything else; full width on desktop. */}
          <div className="report-span">
            <MonthSummary salesMmk={data.month.salesMmk} expensesMmk={data.month.expensesMmk} netMmk={data.month.netMmk} periodMonth={data.month.periodMonth} />
          </div>
          {/* Aligned pairs — rows stretch so each pair shares a bottom edge. */}
          <WeekStrip days={data.week} />
          <TopCustomers customers={data.topCustomers} />
          <TopProducts products={data.topProducts ?? []} />
          <CategoryBreakdown categories={data.categories} />
          <ExpenseCategoryBreakdown categories={data.expenseCategories ?? []} />
          <div className="report-span">
            <ReceivablesList receivables={data.receivables} />
          </div>
          {/* One recruiting card max — names the highest-value missing input. */}
          <div className="report-span">
            <UnlockNext />
          </div>
        </View>
      )}
    </Screen>
  );
}
