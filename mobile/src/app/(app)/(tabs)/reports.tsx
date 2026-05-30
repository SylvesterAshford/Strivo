import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { Screen } from "@/components/layout/Screen";
import { EmptyState } from "@/components/layout/EmptyState";
import { AppText } from "@/components/ui/AppText";
import { WeekStrip } from "@/components/reports/WeekStrip";
import { MonthSummary } from "@/components/reports/MonthSummary";
import { CategoryBreakdown } from "@/components/reports/CategoryBreakdown";
import { ExpenseCategoryBreakdown } from "@/components/reports/ExpenseCategoryBreakdown";
import { TopCustomers } from "@/components/reports/TopCustomers";
import { ReceivablesList } from "@/components/reports/ReceivablesList";
import { fetchReports } from "@/lib/api";
import { spacing } from "@/theme/tokens";
import { my } from "@/i18n/my";

export default function ReportsScreen() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: fetchReports,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const hasData =
    data && (data.month.salesMmk > 0 || data.month.expensesMmk > 0 || data.receivables.length > 0);

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
      <AppText variant="subhead" style={{ marginBottom: spacing["3xl"] }}>
        {my.reports.title}
      </AppText>

      {data && (
        <View style={{ gap: spacing.lg }}>
          <WeekStrip days={data.week} />
          <MonthSummary
            salesMmk={data.month.salesMmk}
            expensesMmk={data.month.expensesMmk}
            netMmk={data.month.netMmk}
          />
          <CategoryBreakdown categories={data.categories} />
          <ExpenseCategoryBreakdown categories={data.expenseCategories ?? []} />
          <TopCustomers customers={data.topCustomers} />
          <ReceivablesList receivables={data.receivables} />
        </View>
      )}
    </Screen>
  );
}
