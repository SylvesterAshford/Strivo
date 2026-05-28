import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateMobileRequest, getOrCreateMobileWorkspace } from "@/lib/auth/mobile";
import { db } from "@/db/client";
import { facts } from "@/db/schema";
import { createId } from "@/lib/id";
import { ColumnMapping, rowsToFacts, type ParsedSheet } from "@/lib/import/sales-excel";
import { triggerInsightsRegen } from "@/lib/insights/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.union([z.string(), z.number(), z.null()]))),
  mapping: ColumnMapping,
});

export async function POST(req: Request) {
  const user = await authenticateMobileRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const sheet: ParsedSheet = { headers: parsed.data.headers, rows: parsed.data.rows };
  const drafts = rowsToFacts(sheet, parsed.data.mapping);
  if (drafts.length === 0) {
    return NextResponse.json({ error: "No usable rows found" }, { status: 400 });
  }

  const workspace = await getOrCreateMobileWorkspace(user);
  const now = new Date();
  const rows = drafts.map((d) => ({
    id: `fact_${createId()}`,
    workspaceId: workspace.id,
    recordingId: null,
    kind: "sale" as const,
    amountMmk: d.amountMmk,
    description: d.description,
    counterparty: d.counterparty,
    occurredAt: d.occurredAt,
    createdAt: now,
  }));

  // Batch insert. Drizzle handles arrays natively; no row-by-row.
  await db.insert(facts).values(rows);

  // The new history will reshape SWOT/forecast — kick a background regen.
  triggerInsightsRegen(workspace.id);

  return NextResponse.json({ inserted: rows.length });
}
