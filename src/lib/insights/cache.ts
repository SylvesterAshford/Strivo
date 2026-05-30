import { db } from "@/db/client";
import { workspaces, facts } from "@/db/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { generateInsights, type FactInput, type ProfileInput } from "./strategic";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const inflight = new Map<string, Promise<void>>();

export function isStale(generatedAt: Date | null | undefined): boolean {
  if (!generatedAt) return true;
  return Date.now() - new Date(generatedAt).getTime() > CACHE_TTL_MS;
}

/** Fire-and-forget: trigger a background regen. Coalesces concurrent calls. */
export function triggerInsightsRegen(workspaceId: string): void {
  if (inflight.has(workspaceId)) return;
  const job = regenerateInsights(workspaceId).catch((err) => {
    console.error("[insights.cache] regen failed", workspaceId, err);
  });
  inflight.set(workspaceId, job);
  job.finally(() => inflight.delete(workspaceId));
}

/**
 * Awaitable: regenerate and persist. Caller awaits when no cache exists.
 *
 * Background jobs run outside of a request context, so we set the
 * `app.workspace_id` session variable manually around the DB work to
 * satisfy RLS. The LLM call happens outside the transaction so we don't
 * hold a connection open for 20-40s during Gemini reasoning.
 */
export async function regenerateInsights(workspaceId: string): Promise<void> {
  // Phase 1: pull workspace + facts inside a scoped transaction.
  const phase1 = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.workspace_id', ${workspaceId}, true)`);

    const [ws] = await tx.select().from(workspaces).where(eq(workspaces.id, workspaceId));
    if (!ws) return null;

    await tx
      .update(workspaces)
      .set({ insightsStatus: "generating" })
      .where(eq(workspaces.id, workspaceId));

    const since = new Date();
    since.setDate(since.getDate() - 60);
    since.setHours(0, 0, 0, 0);

    const rows = await tx
      .select({
        kind: facts.kind,
        amountMmk: facts.amountMmk,
        description: facts.description,
        counterparty: facts.counterparty,
        occurredAt: facts.occurredAt,
      })
      .from(facts)
      .where(and(eq(facts.workspaceId, workspaceId), gte(facts.occurredAt, since)))
      .orderBy(desc(facts.occurredAt));

    return { ws, rows };
  });

  if (!phase1) return;

  const { ws, rows } = phase1;
  const hasSignal = rows.some((r) => r.kind === "sale" || r.kind === "expense");
  if (!hasSignal) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.workspace_id', ${workspaceId}, true)`);
      await tx.update(workspaces).set({ insightsStatus: "idle" }).where(eq(workspaces.id, workspaceId));
    });
    return;
  }

  const input: FactInput[] = rows.map((r) => ({
    kind: r.kind,
    amountMmk: r.amountMmk,
    description: r.description,
    counterparty: r.counterparty,
    occurredAt: r.occurredAt,
  }));

  const profile: ProfileInput = {
    businessName: ws.name,
    businessType: ws.businessType,
    productService: ws.productService,
    location: ws.location,
    monthlyTargetMmk: ws.monthlyTargetMmk,
    biggestChallenge: ws.biggestChallenge,
    budgetMmk: ws.budgetMmk,
    competitors: ws.competitors ?? [],
  };

  // Phase 2: long LLM call outside any transaction.
  try {
    const insights = await generateInsights(input, profile, 30);
    // Phase 3: persist the result inside a fresh scoped transaction.
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.workspace_id', ${workspaceId}, true)`);
      await tx
        .update(workspaces)
        .set({
          insightsJson: insights,
          insightsGeneratedAt: new Date(),
          insightsStatus: "idle",
        })
        .where(eq(workspaces.id, workspaceId));
    });
  } catch (err) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.workspace_id', ${workspaceId}, true)`);
      await tx.update(workspaces).set({ insightsStatus: "idle" }).where(eq(workspaces.id, workspaceId));
    });
    throw err;
  }
}
