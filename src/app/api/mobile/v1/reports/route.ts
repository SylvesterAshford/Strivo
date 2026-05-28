import { NextResponse } from "next/server";
import { authenticateMobileRequest, getOrCreateMobileWorkspace } from "@/lib/auth/mobile";
import { db } from "@/db/client";
import { facts } from "@/db/schema";
import { eq, and, gte, lt, sum, count, sql, desc, isNotNull } from "drizzle-orm";

// Build the 7-day window: day 0 = today, day 6 = 6 days ago (all in local UTC).
function weekWindow(): { dayStart: Date; dayEnd: Date; label: string }[] {
  const days = [];
  const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const end = new Date(d);
    end.setDate(end.getDate() + 1);
    days.push({ dayStart: d, dayEnd: end, label: i === 0 ? "TODAY" : DAY_LABELS[d.getDay()] });
  }
  return days;
}

export async function GET(req: Request) {
  const user = await authenticateMobileRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await getOrCreateMobileWorkspace(user);
  const wsId = workspace.id;

  // === Week strip (last 7 days, daily sales + expenses) ===
  const days = weekWindow();
  const weekStart = days[0].dayStart;
  const weekEnd = days[6].dayEnd;

  // === Month totals ===
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const nextMonthStart = new Date(monthStart);
  nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);

  // Run all queries in parallel — Neon round-trip is the bottleneck.
  const [weekRows, [monthSales], [monthExpenses], receivables, topCustomerRows, categoryRows] = await Promise.all([
    db
      .select({
        kind: facts.kind,
        day: sql<string>`date_trunc('day', ${facts.occurredAt})`,
        total: sum(facts.amountMmk),
      })
      .from(facts)
      .where(
        and(
          eq(facts.workspaceId, wsId),
          gte(facts.occurredAt, weekStart),
          lt(facts.occurredAt, weekEnd),
          sql`${facts.kind} IN ('sale', 'expense')`
        )
      )
      .groupBy(facts.kind, sql`date_trunc('day', ${facts.occurredAt})`),
    db
      .select({ total: sum(facts.amountMmk) })
      .from(facts)
      .where(
        and(
          eq(facts.workspaceId, wsId),
          eq(facts.kind, "sale"),
          gte(facts.occurredAt, monthStart),
          lt(facts.occurredAt, nextMonthStart)
        )
      ),
    db
      .select({ total: sum(facts.amountMmk) })
      .from(facts)
      .where(
        and(
          eq(facts.workspaceId, wsId),
          eq(facts.kind, "expense"),
          gte(facts.occurredAt, monthStart),
          lt(facts.occurredAt, nextMonthStart)
        )
      ),
    db
      .select({
        id: facts.id,
        description: facts.description,
        amountMmk: facts.amountMmk,
        counterparty: facts.counterparty,
        occurredAt: facts.occurredAt,
      })
      .from(facts)
      .where(and(eq(facts.workspaceId, wsId), eq(facts.kind, "receivable")))
      .orderBy(facts.occurredAt)
      .limit(20),
    db
      .select({
        name: facts.counterparty,
        totalMmk: sum(facts.amountMmk),
        count: count(facts.id),
      })
      .from(facts)
      .where(
        and(
          eq(facts.workspaceId, wsId),
          eq(facts.kind, "sale"),
          isNotNull(facts.counterparty),
          gte(facts.occurredAt, monthStart),
          lt(facts.occurredAt, nextMonthStart)
        )
      )
      .groupBy(facts.counterparty)
      .orderBy(desc(sum(facts.amountMmk)))
      .limit(5),
    db
      .select({
        kind: facts.kind,
        totalMmk: sum(facts.amountMmk),
        count: count(facts.id),
      })
      .from(facts)
      .where(
        and(
          eq(facts.workspaceId, wsId),
          gte(facts.occurredAt, monthStart),
          lt(facts.occurredAt, nextMonthStart)
        )
      )
      .groupBy(facts.kind),
  ]);

  // Map rows into day buckets
  const weekData = days.map(({ dayStart, label }) => {
    const key = dayStart.toISOString().slice(0, 10);
    const saleRow = weekRows.find(
      (r) => r.kind === "sale" && String(r.day).slice(0, 10) === key
    );
    const expRow = weekRows.find(
      (r) => r.kind === "expense" && String(r.day).slice(0, 10) === key
    );
    return {
      label,
      salesMmk: parseInt(String(saleRow?.total ?? "0"), 10) || 0,
      expensesMmk: parseInt(String(expRow?.total ?? "0"), 10) || 0,
    };
  });

  const monthSalesMmk = parseInt(String(monthSales?.total ?? "0"), 10) || 0;
  const monthExpensesMmk = parseInt(String(monthExpenses?.total ?? "0"), 10) || 0;

  return NextResponse.json({
    week: weekData,
    month: {
      salesMmk: monthSalesMmk,
      expensesMmk: monthExpensesMmk,
      netMmk: monthSalesMmk - monthExpensesMmk,
    },
    topCustomers: topCustomerRows.map((r) => ({
      name: r.name ?? "",
      totalMmk: parseInt(String(r.totalMmk ?? "0"), 10) || 0,
      count: Number(r.count) || 0,
    })),
    categories: categoryRows.map((r) => ({
      kind: r.kind,
      totalMmk: parseInt(String(r.totalMmk ?? "0"), 10) || 0,
      count: Number(r.count) || 0,
    })),
    receivables: receivables.map((r) => ({
      id: r.id,
      description: r.description,
      amountMmk: r.amountMmk,
      counterparty: r.counterparty,
      occurredAt: r.occurredAt,
    })),
  });
}
