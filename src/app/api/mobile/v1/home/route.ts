import { NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth/mobile";
import { facts } from "@/db/schema";
import { eq, and, gte, lt, desc, sum, count, max, isNotNull } from "drizzle-orm";
import { buildAdvisor, monthBounds, priorMonthBounds, ym, type AdvisorHome } from "@/lib/advisor/monthly";

function num(v: unknown): number {
  return parseInt(String(v ?? "0"), 10) || 0;
}

export async function GET(req: Request) {
  return withMobileAuth(req, async (db, workspace) => {
    const wsId = workspace.id;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6); // rolling 7 days incl. today

    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 29); // rolling 30 days

    const sumWhere = (...conds: Parameters<typeof and>) =>
      db.select({ total: sum(facts.amountMmk) }).from(facts).where(and(...conds));

    const [
      [todaySales],
      [todayExp],
      [yestSales],
      [weekSales],
      [monthSales],
      [outstanding],
      recentToday,
      recentFallback,
      [latestRow],
    ] = await Promise.all([
      sumWhere(eq(facts.workspaceId, wsId), eq(facts.kind, "sale"), gte(facts.occurredAt, todayStart), lt(facts.occurredAt, todayEnd)),
      sumWhere(eq(facts.workspaceId, wsId), eq(facts.kind, "expense"), gte(facts.occurredAt, todayStart), lt(facts.occurredAt, todayEnd)),
      sumWhere(eq(facts.workspaceId, wsId), eq(facts.kind, "sale"), gte(facts.occurredAt, yesterdayStart), lt(facts.occurredAt, todayStart)),
      sumWhere(eq(facts.workspaceId, wsId), eq(facts.kind, "sale"), gte(facts.occurredAt, weekStart), lt(facts.occurredAt, todayEnd)),
      sumWhere(eq(facts.workspaceId, wsId), eq(facts.kind, "sale"), gte(facts.occurredAt, monthStart), lt(facts.occurredAt, todayEnd)),
      sumWhere(eq(facts.workspaceId, wsId), eq(facts.kind, "receivable"), gte(facts.occurredAt, monthStart), lt(facts.occurredAt, todayEnd)),
      db
        .select({
          id: facts.id,
          kind: facts.kind,
          description: facts.description,
          amountMmk: facts.amountMmk,
          counterparty: facts.counterparty,
          occurredAt: facts.occurredAt,
        })
        .from(facts)
        .where(and(eq(facts.workspaceId, wsId), gte(facts.occurredAt, todayStart), lt(facts.occurredAt, todayEnd)))
        .orderBy(desc(facts.occurredAt))
        .limit(8),
      // Fallback: most recent facts regardless of date — used when today is empty.
      db
        .select({
          id: facts.id,
          kind: facts.kind,
          description: facts.description,
          amountMmk: facts.amountMmk,
          counterparty: facts.counterparty,
          occurredAt: facts.occurredAt,
        })
        .from(facts)
        .where(eq(facts.workspaceId, wsId))
        .orderBy(desc(facts.occurredAt))
        .limit(8),
      // Latest fact date — anchors the advisor on the most-recent month WITH data.
      db.select({ m: max(facts.occurredAt) }).from(facts).where(eq(facts.workspaceId, wsId)),
    ]);

    // ── Monthly Profit Advisor ──────────────────────────────────────────────
    // Derived from the most-recent month that has data (not the calendar month),
    // so it's meaningful right after a monthly batch import. Derivation is wrapped
    // so a logic bug degrades to advisor:null instead of 500-ing the whole home.
    let advisor: AdvisorHome | null = null;
    try {
      const latest = latestRow?.m ? new Date(latestRow.m) : null;
      if (latest) {
        const tb = monthBounds(latest);
        const pb = priorMonthBounds(tb);
        const monthKindSum = (kind: "sale" | "expense", start: Date, end: Date) =>
          db
            .select({ total: sum(facts.amountMmk) })
            .from(facts)
            .where(and(eq(facts.workspaceId, wsId), eq(facts.kind, kind), gte(facts.occurredAt, start), lt(facts.occurredAt, end)));

        const [[tSales], [tExp], [lSales], [lExp], [outAll], [txc], topCatRows] = await Promise.all([
          monthKindSum("sale", tb.start, tb.end),
          monthKindSum("expense", tb.start, tb.end),
          monthKindSum("sale", pb.start, pb.end),
          monthKindSum("expense", pb.start, pb.end),
          db.select({ total: sum(facts.amountMmk) }).from(facts).where(and(eq(facts.workspaceId, wsId), eq(facts.kind, "receivable"))),
          db.select({ c: count(facts.id) }).from(facts).where(and(eq(facts.workspaceId, wsId), gte(facts.occurredAt, tb.start), lt(facts.occurredAt, tb.end))),
          db
            .select({ category: facts.category, total: sum(facts.amountMmk) })
            .from(facts)
            .where(and(eq(facts.workspaceId, wsId), eq(facts.kind, "expense"), isNotNull(facts.category), gte(facts.occurredAt, tb.start), lt(facts.occurredAt, tb.end)))
            .groupBy(facts.category)
            .orderBy(desc(sum(facts.amountMmk)))
            .limit(1),
        ]);

        const lastSales = num(lSales?.total);
        const lastExp = num(lExp?.total);
        advisor = buildAdvisor({
          thisMonth: { salesMmk: num(tSales?.total), expensesMmk: num(tExp?.total) },
          lastMonth: lastSales || lastExp ? { salesMmk: lastSales, expensesMmk: lastExp } : null,
          outstandingMmk: num(outAll?.total),
          topExpenseCategory: topCatRows[0]?.category ?? null,
          dataThrough: latest.toISOString(),
          periodMonth: ym(tb.start),
          txCount: num(txc?.c),
        });
      }
    } catch (e) {
      console.error("[home] advisor derivation failed:", e);
      advisor = null;
    }

    return NextResponse.json({
      todaySalesMmk: num(todaySales?.total),
      todayExpensesMmk: num(todayExp?.total),
      yesterdaySalesMmk: num(yestSales?.total),
      weekSalesMmk: num(weekSales?.total),
      monthRevenueMmk: num(monthSales?.total),
      outstandingMmk: num(outstanding?.total),
      recentToday,
      // Latest entries across all dates — shown when today is empty so the
      // home screen is never blank for an account that has historical data.
      recentFallback,
      advisor,
    });
  });
}
