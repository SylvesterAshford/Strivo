import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authenticateMobileRequest,
  getOrCreateMobileWorkspace,
  withWorkspaceScope,
} from "@/lib/auth/mobile";
import { facts, importBatches } from "@/db/schema";
import { createId } from "@/lib/id";
import { extractFacts } from "@/lib/extraction/mobile-facts";
import { newBatchId } from "@/lib/import/batches";
import { triggerInsightsRegen } from "@/lib/insights/cache";

export const runtime = "nodejs";
// Burmese fact extraction can be slow when Gemini is overloaded (3 retries
// with backoff). Give the route plenty of headroom so it isn't killed
// before the LLM finishes thinking.
export const maxDuration = 300;

const Body = z.object({
  text: z.string().min(10).max(10_000),
});

export async function POST(req: Request) {
  const user = await authenticateMobileRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // LLM call outside any transaction.
  let drafts;
  try {
    drafts = await extractFacts(parsed.data.text);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown extraction error";
    console.error("[import.text] extraction failed", err);
    return NextResponse.json({ error: `Extraction failed: ${message}` }, { status: 502 });
  }
  if (drafts.length === 0) {
    return NextResponse.json({ inserted: 0, error: "No facts found in text" }, { status: 200 });
  }

  const workspace = await getOrCreateMobileWorkspace(user);
  const now = new Date();
  const batchId = newBatchId();
  const rows = drafts.map((d) => ({
    id: `fact_${createId()}`,
    workspaceId: workspace.id,
    batchId,
    kind: d.kind,
    amountMmk: d.amountMmk ?? null,
    description: d.description.slice(0, 200),
    counterparty: d.counterparty ?? null,
    category: d.category ?? null,
    productName: d.kind === "sale" ? (d.productName ?? null) : null,
    quantity: d.kind === "sale" ? (d.quantity ?? null) : null,
    unitPriceMmk:
      d.kind === "sale" && d.amountMmk && d.quantity ? Math.round(d.amountMmk / d.quantity) : null,
    occurredAt: now,
    // Free-text import has no per-row date — stamps "now", so not date-reliable.
    occurredAtSource: "estimated" as const,
    createdAt: now,
  }));

  await withWorkspaceScope(workspace.id, async (tx) => {
    // Text imports are tracked as batches (history + undo) but never deduped —
    // pasted text is explicit user intent, and occurredAt=now keys can't
    // meaningfully collide with prior imports anyway.
    await tx.insert(importBatches).values({
      id: batchId,
      workspaceId: workspace.id,
      source: "sales-text",
      fileName: null,
      rowCount: rows.length,
      insertedCount: rows.length,
      skippedCount: 0,
      createdAt: now,
    });
    await tx.insert(facts).values(rows);
  });
  triggerInsightsRegen(workspace.id);

  return NextResponse.json({ inserted: rows.length, batchId });
}
