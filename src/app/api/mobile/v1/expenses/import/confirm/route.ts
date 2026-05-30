import { NextResponse } from "next/server";
import { z } from "zod";
import { withMobileAuth } from "@/lib/auth/mobile";
import { facts } from "@/db/schema";
import { createId } from "@/lib/id";
import {
  ExpenseColumnMapping,
  rowsToExpenseFacts,
  type ParsedSheet,
} from "@/lib/import/expense-excel";
import { triggerInsightsRegen } from "@/lib/insights/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.union([z.string(), z.number(), z.null()]))),
  mapping: ExpenseColumnMapping,
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const sheet: ParsedSheet = { headers: parsed.data.headers, rows: parsed.data.rows };
  const drafts = rowsToExpenseFacts(sheet, parsed.data.mapping);
  if (drafts.length === 0) {
    return NextResponse.json({ error: "No usable rows found" }, { status: 400 });
  }

  return withMobileAuth(req, async (db, workspace) => {
    const now = new Date();
    const rows = drafts.map((d) => ({
      id: `fact_${createId()}`,
      workspaceId: workspace.id,
      recordingId: null,
      kind: "expense" as const,
      amountMmk: d.amountMmk,
      description: d.description,
      counterparty: d.counterparty,
      category: d.category,
      occurredAt: d.occurredAt,
      createdAt: now,
    }));

    await db.insert(facts).values(rows);
    triggerInsightsRegen(workspace.id);

    return NextResponse.json({ inserted: rows.length });
  });
}
