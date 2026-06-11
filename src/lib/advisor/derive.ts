// Shared DB-side derivation of the monthly advisor. Both /home and /insights call
// this so they show the SAME profit + "why it changed" for the same business —
// reconciliation by construction (see strivo-screen-logic.md trust rule, now
// extended to the Analytics screen). Windows on the MMT reviewed-month via
// resolveReviewedMonth, exactly like /reports.
//
//   max(occurredAt) ─▶ reviewedMonthFrom ─▶ this/prior month aggregates ─▶ buildAdvisor

import { eq, and, gte, lt, sum, count, max, isNotNull, desc } from "drizzle-orm";
import { facts } from "@/db/schema";
import type { Tx } from "@/lib/auth/mobile";
import { buildAdvisor, priorMonthBounds, type AdvisorHome } from "./monthly";
import { reviewedMonthFrom } from "./period";

function num(v: unknown): number {
  return parseInt(String(v ?? "0"), 10) || 0;
}

/**
 * Derive the monthly advisor for a workspace, or null when there's no data.
 * Pure-of-policy: all month math flows through reviewedMonthFrom + buildAdvisor.
 */
export async function deriveAdvisor(db: Tx, wsId: string): Promise<AdvisorHome | null> {
  const [latestRow] = await db.select({ m: max(facts.occurredAt) }).from(facts).where(eq(facts.workspaceId, wsId));
  const latest = latestRow?.m ? new Date(latestRow.m) : null;
  const reviewed = reviewedMonthFrom(latest);
  if (!reviewed || !latest) return null;

  const tb = { start: reviewed.start, end: reviewed.end };
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
  return buildAdvisor({
    thisMonth: { salesMmk: num(tSales?.total), expensesMmk: num(tExp?.total) },
    lastMonth: lastSales || lastExp ? { salesMmk: lastSales, expensesMmk: lastExp } : null,
    outstandingMmk: num(outAll?.total),
    topExpenseCategory: topCatRows[0]?.category ?? null,
    dataThrough: latest.toISOString(),
    periodMonth: reviewed.periodMonth,
    txCount: num(txc?.c),
  });
}
