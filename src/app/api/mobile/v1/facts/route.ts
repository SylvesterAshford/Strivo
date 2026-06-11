import { NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth/mobile";
import { facts } from "@/db/schema";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { monthBounds } from "@/lib/advisor/monthly";

// Shared drill-down feed: "the N transactions behind this figure." Every Analytics
// card links here with a filter (month, kind). One endpoint + one screen = every
// figure is traceable without N bespoke list views.
//   GET /api/mobile/v1/facts?month=YYYY-MM&kind=sale|expense|receivable|note
const KINDS = new Set(["sale", "expense", "receivable", "note"]);

export async function GET(req: Request) {
  return withMobileAuth(req, async (db, workspace) => {
    const url = new URL(req.url);
    const month = url.searchParams.get("month"); // YYYY-MM (MMT)
    const kind = url.searchParams.get("kind");

    const conds = [eq(facts.workspaceId, workspace.id)];
    if (kind && KINDS.has(kind)) {
      conds.push(eq(facts.kind, kind as "sale" | "expense" | "receivable" | "note"));
    }
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      // Anchor a date mid-month, then take MMT bounds — same windowing as the cards.
      const [y, m] = month.split("-").map((n) => parseInt(n, 10));
      const { start, end } = monthBounds(new Date(Date.UTC(y, m - 1, 15)));
      conds.push(gte(facts.occurredAt, start), lt(facts.occurredAt, end));
    }

    const entries = await db
      .select({
        id: facts.id,
        kind: facts.kind,
        description: facts.description,
        amountMmk: facts.amountMmk,
        counterparty: facts.counterparty,
        occurredAt: facts.occurredAt,
      })
      .from(facts)
      .where(and(...conds))
      .orderBy(desc(facts.occurredAt))
      .limit(200);

    return NextResponse.json({ entries });
  });
}
