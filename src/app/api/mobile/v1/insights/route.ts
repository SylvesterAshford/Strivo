import { NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth/mobile";
import { facts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { type StrategicInsights } from "@/lib/insights/strategic";
import { isStale, triggerInsightsRegen } from "@/lib/insights/cache";
import { deriveAdvisor } from "@/lib/advisor/derive";

// Analytics screen feed. The DETERMINISTIC block (money summary, why-profit-moved,
// who-owes-you) is computed per-request from the same source as Home/Reports, so all
// three reconcile — and it never waits on the LLM. The LLM strategic blob (recommendation
// copy, scenario context) is secondary: served from cache if present, regenerated in the
// background otherwise. No inline cold-start = the honest numbers are always instant.
export async function GET(req: Request) {
  return withMobileAuth(req, async (db, workspace) => {
    // Deterministic, shared with Home/Reports — reconciles by construction.
    let advisor = null;
    try {
      advisor = await deriveAdvisor(db, workspace.id);
    } catch (e) {
      console.error("[insights] advisor derivation failed:", e);
    }

    // Who owes you — oldest first. Simple list (not 0–30/31–60/60+ buckets).
    const receivables = await db
      .select({
        id: facts.id,
        description: facts.description,
        amountMmk: facts.amountMmk,
        counterparty: facts.counterparty,
        occurredAt: facts.occurredAt,
      })
      .from(facts)
      .where(and(eq(facts.workspaceId, workspace.id), eq(facts.kind, "receivable")))
      .orderBy(facts.occurredAt) // ascending = oldest first
      .limit(50);

    // No advisor (no sale/expense data) and no receivables = nothing to show.
    if (!advisor && receivables.length === 0) {
      return NextResponse.json({ ready: false });
    }

    // LLM blob (recommendations + scenario context) — secondary, never blocks.
    const cached = workspace.insightsJson as StrategicInsights | null;
    const generatedAt = workspace.insightsGeneratedAt;
    const regenerating = !cached || isStale(generatedAt);
    if (regenerating) triggerInsightsRegen(workspace.id); // fire-and-forget

    return NextResponse.json({
      ready: true,
      analytics: { advisor, receivables },
      insights: cached ?? null,
      generatedAt: generatedAt?.toISOString() ?? null,
      regenerating,
    });
  });
}
