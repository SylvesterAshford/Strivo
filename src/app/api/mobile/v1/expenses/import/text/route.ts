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
export const maxDuration = 300;

const Body = z.object({
  text: z.string().min(10).max(10_000),
});

/**
 * Free-text expense import. Reuses extractFacts; on the expense-import flow
 * we only persist drafts where the model labels kind="expense". Non-expense
 * extractions are dropped (the user is explicitly importing expenses).
 */
export async function POST(req: Request) {
  const user = await authenticateMobileRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let drafts;
  try {
    drafts = await extractFacts(parsed.data.text);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown extraction error";
    console.error("[expense-import.text] extraction failed", err);
    return NextResponse.json({ error: `Extraction failed: ${message}` }, { status: 502 });
  }

  const expenseDrafts = drafts.filter((d) => d.kind === "expense");
  if (expenseDrafts.length === 0) {
    return NextResponse.json({ inserted: 0, error: "No expenses found in text" }, { status: 200 });
  }

  const workspace = await getOrCreateMobileWorkspace(user);
  const now = new Date();
  const batchId = newBatchId();
  const rows = expenseDrafts.map((d) => ({
    id: `fact_${createId()}`,
    workspaceId: workspace.id,
    batchId,
    kind: "expense" as const,
    amountMmk: d.amountMmk ?? null,
    description: d.description.slice(0, 200),
    counterparty: d.counterparty ?? null,
    category: d.category ?? null,
    occurredAt: now,
    // Free-text import has no per-row date — stamps "now", so not date-reliable.
    occurredAtSource: "estimated" as const,
    createdAt: now,
  }));

  await withWorkspaceScope(workspace.id, async (tx) => {
    // Tracked as a batch (history + undo); text imports are never deduped.
    await tx.insert(importBatches).values({
      id: batchId,
      workspaceId: workspace.id,
      source: "expenses-text",
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
