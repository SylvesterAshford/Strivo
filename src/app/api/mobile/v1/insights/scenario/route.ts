import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateMobileRequest, getOrCreateMobileWorkspace } from "@/lib/auth/mobile";
import { runScenario } from "@/lib/insights/scenario";
import type { StrategicInsights, ProfileInput } from "@/lib/insights/strategic";

export const runtime = "nodejs";
// Burmese reasoning + 3 Gemini retries can take a while — give the route plenty
// of headroom so it isn't killed mid-thought.
export const maxDuration = 300;

const Body = z.object({
  scenario: z.string().min(5).max(500),
});

export async function POST(req: Request) {
  const user = await authenticateMobileRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const workspace = await getOrCreateMobileWorkspace(user);

  // Scenarios are grounded in the existing cached report. If there isn't one
  // yet, ask the client to run insights first.
  const insights = workspace.insightsJson as StrategicInsights | null;
  if (!insights) {
    return NextResponse.json({ ready: false });
  }

  const profile: ProfileInput = {
    businessName: workspace.name,
    businessType: workspace.businessType,
    productService: workspace.productService,
    location: workspace.location,
    monthlyTargetMmk: workspace.monthlyTargetMmk,
    biggestChallenge: workspace.biggestChallenge,
    budgetMmk: workspace.budgetMmk,
    competitors: workspace.competitors ?? [],
  };

  try {
    const result = await runScenario(insights, profile, parsed.data.scenario, workspace.id);
    return NextResponse.json({ ready: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown scenario error";
    console.error("[insights.scenario] generation failed", err);
    return NextResponse.json({ error: `Scenario failed: ${message}` }, { status: 502 });
  }
}
