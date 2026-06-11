import { NextResponse } from "next/server";
import { z } from "zod";
import { withMobileAuth } from "@/lib/auth/mobile";
import { facts, importBatches } from "@/db/schema";
import { createId } from "@/lib/id";
import { ColumnMapping, rowsToFacts, type ParsedSheet } from "@/lib/import/sales-excel";
import { applyCountAwareDedupe, fetchExistingCounts, newBatchId } from "@/lib/import/batches";
import { MAX_CONFIRM_ROWS } from "@/lib/import/constants";
import { triggerInsightsRegen } from "@/lib/insights/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  headers: z.array(z.string()),
  // Cap before any work: preview limits file size, but a client can POST
  // straight to confirm — reject beats crash.
  rows: z
    .array(z.array(z.union([z.string(), z.number(), z.null()])))
    .max(MAX_CONFIRM_ROWS, `စာရင်းကြောင်း ${MAX_CONFIRM_ROWS} ထက် မပိုရပါ`),
  mapping: ColumnMapping,
  fileName: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const sheet: ParsedSheet = { headers: parsed.data.headers, rows: parsed.data.rows };
  // Re-validate server-side — confirm cannot trust the client's preview.
  const { facts: drafts, flagged } = rowsToFacts(sheet, parsed.data.mapping);
  if (drafts.length === 0) {
    return NextResponse.json(
      { error: "No usable rows found", flagged, flaggedCount: flagged.length },
      { status: 400 }
    );
  }

  return withMobileAuth(req, async (db, workspace) => {
    const now = new Date();
    const candidates = drafts.map((d) => ({
      kind: "sale" as const,
      amountMmk: d.amountMmk,
      description: d.description,
      counterparty: d.counterparty,
      occurredAt: d.occurredAt,
      productName: d.productName,
      quantity: d.quantity,
      unitPriceMmk: d.unitPriceMmk,
    }));

    // Count-aware dedupe: re-uploading an updated ledger only lands the delta.
    const existing = await fetchExistingCounts(db, workspace.id, candidates);
    const { keep, skipped } = applyCountAwareDedupe(candidates, existing);

    const batchId = newBatchId();
    await db.insert(importBatches).values({
      id: batchId,
      workspaceId: workspace.id,
      source: "sales-excel",
      fileName: parsed.data.fileName ?? null,
      rowCount: drafts.length,
      insertedCount: keep.length,
      skippedCount: skipped,
      createdAt: now,
    });

    if (keep.length > 0) {
      await db.insert(facts).values(
        keep.map((d) => ({
          id: `fact_${createId()}`,
          workspaceId: workspace.id,
          batchId,
          kind: d.kind,
          amountMmk: d.amountMmk,
          description: d.description,
          counterparty: d.counterparty,
          productName: d.productName,
          quantity: d.quantity,
          unitPriceMmk: d.unitPriceMmk,
          occurredAt: d.occurredAt,
          // File import carries a real per-row date → date-reliable.
          occurredAtSource: "explicit" as const,
          createdAt: now,
        }))
      );
      // The new history will reshape insights — kick a background regen.
      triggerInsightsRegen(workspace.id);
    }

    return NextResponse.json({
      inserted: keep.length,
      skipped,
      batchId,
      flagged,
      flaggedCount: flagged.length,
    });
  });
}
