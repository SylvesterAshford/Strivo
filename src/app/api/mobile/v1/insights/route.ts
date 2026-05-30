import { NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth/mobile";
import { facts, workspaces } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { type StrategicInsights } from "@/lib/insights/strategic";
import { isStale, regenerateInsights, triggerInsightsRegen } from "@/lib/insights/cache";

export async function GET(req: Request) {
  return withMobileAuth(req, async (db, workspace) => {
    // Need at least one sale/expense to compute anything useful.
    const since = new Date();
    since.setDate(since.getDate() - 60);
    since.setHours(0, 0, 0, 0);
    const sampleRow = await db
      .select({ id: facts.id })
      .from(facts)
      .where(and(eq(facts.workspaceId, workspace.id), gte(facts.occurredAt, since)))
      .limit(1);
    if (sampleRow.length === 0) {
      return NextResponse.json({ ready: false });
    }

    const cached = workspace.insightsJson as StrategicInsights | null;
    const generatedAt = workspace.insightsGeneratedAt;

    // Cached: return instantly, regen in background if stale.
    if (cached) {
      if (isStale(generatedAt)) triggerInsightsRegen(workspace.id);
      return NextResponse.json({
        ready: true,
        insights: cached,
        generatedAt: generatedAt?.toISOString() ?? null,
        regenerating: isStale(generatedAt),
      });
    }

    // Cold start: generate inline, persist, then return.
    // regenerateInsights opens its own scoped transactions, so we can't
    // call it from inside this request's transaction.
    try {
      await regenerateInsights(workspace.id);
      const [row] = await db
        .select({ insightsJson: workspaces.insightsJson, insightsGeneratedAt: workspaces.insightsGeneratedAt })
        .from(workspaces)
        .where(eq(workspaces.id, workspace.id));
      const fresh = row?.insightsJson as StrategicInsights | null;
      if (!fresh) return NextResponse.json({ ready: false });
      return NextResponse.json({
        ready: true,
        insights: fresh,
        generatedAt: row?.insightsGeneratedAt?.toISOString() ?? null,
        regenerating: false,
      });
    } catch (err) {
      console.error("[insights] cold-start generation failed", err);
      return NextResponse.json({ error: "Insight generation failed" }, { status: 502 });
    }
  });
}
