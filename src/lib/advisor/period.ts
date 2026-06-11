// Single source of truth for "which month are we reviewing?".
//
// Both Home (the advisor) and Reports must show the SAME month and the SAME
// profit for it — otherwise the receipts contradict the verdict and the owner
// trusts neither (see strivo-screen-logic.md "trust reconciliation rule"). The
// only way to guarantee they agree is to resolve the month in one place.
//
//   max(occurredAt) ──▶ reviewedMonthFrom ──▶ { start, end, periodMonth } | null
//                            (pure)              MMT bounds + "YYYY-MM" label
//
// `resolveReviewedMonth` is the thin DB wrapper; `reviewedMonthFrom` is pure so
// the month math is unit-tested without a database.

import { eq, max } from "drizzle-orm";
import { facts } from "@/db/schema";
import type { Tx } from "@/lib/auth/mobile";
import { monthBounds, ym } from "./monthly";

export interface ReviewedMonth {
  /** UTC instant of MMT-midnight on the 1st of the reviewed month. */
  start: Date;
  /** UTC instant of MMT-midnight on the 1st of the next month. */
  end: Date;
  /** The reviewed month as "YYYY-MM" (MMT). */
  periodMonth: string;
}

/**
 * The month to review, derived from the latest fact date. Returns null when the
 * workspace has no data at all (no max date) — callers decide the fallback.
 * Pure: same input, same output, no DB.
 */
export function reviewedMonthFrom(maxOccurredAt: Date | null): ReviewedMonth | null {
  if (!maxOccurredAt) return null;
  const { start, end } = monthBounds(maxOccurredAt);
  return { start, end, periodMonth: ym(start) };
}

/**
 * Resolve the reviewed month for a workspace by reading the latest fact date.
 * Thin wrapper over `reviewedMonthFrom` — the only DB access lives here.
 */
export async function resolveReviewedMonth(db: Tx, workspaceId: string): Promise<ReviewedMonth | null> {
  const [row] = await db
    .select({ m: max(facts.occurredAt) })
    .from(facts)
    .where(eq(facts.workspaceId, workspaceId));
  return reviewedMonthFrom(row?.m ? new Date(row.m) : null);
}
