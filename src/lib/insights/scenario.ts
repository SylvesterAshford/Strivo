import { z } from "zod";
import { getLLM } from "@/lib/llm";
import type { StrategicInsights, ProfileInput } from "@/lib/insights/strategic";

// ── Types ───────────────────────────────────────────────────────────────────

export const ScenarioProjection = z.object({
  headline: z.string().min(1).max(200),
  estimatedImpact: z.object({
    salesPct: z.number().min(-100).max(500),
    marginPct: z.number().min(-100).max(500),
    risk: z.enum(["low", "medium", "high"]),
  }),
  watchFor: z.array(z.string().min(1).max(200)).min(0).max(5),
  steps: z.array(z.string().min(1).max(280)).min(3).max(3),
  caveats: z.array(z.string().min(1).max(200)).max(2),
});
export type ScenarioProjection = z.infer<typeof ScenarioProjection>;

const SCHEMA_DESC = `{
  "headline": "<one Burmese sentence summarising the projected outcome>",
  "estimatedImpact": {
    "salesPct":  <integer projected % change in monthly sales, negative if drop>,
    "marginPct": <integer projected % change in profit margin>,
    "risk":      "low" | "medium" | "high"
  },
  "watchFor": ["<Burmese signal 1>", "<Burmese signal 2>", ...up to 5],
  "steps":    ["<Burmese action 1>", "<Burmese action 2>", "<Burmese action 3>"],
  "caveats":  ["<Burmese caveat 1>"]
}`;

// ── Prompt ──────────────────────────────────────────────────────────────────

function buildPrompt(
  insights: StrategicInsights,
  profile: ProfileInput,
  scenario: string
): string {
  const m = insights.metrics;
  const top = m.topCustomers
    .slice(0, 3)
    .map((c) => `${c.name} (${c.totalMmk.toLocaleString()} MMK)`)
    .join(", ");
  const segments = m.customerSegments
    .filter((s) => s.customers > 0)
    .map((s) => `${s.key}=${s.customers}`)
    .join(", ");
  const competitors = profile.competitors.length ? profile.competitors.join(", ") : "—";

  return `You are advising a small business owner in Myanmar. The owner is considering a
specific decision and wants a focused projection grounded in their current data.

CURRENT BUSINESS STATE (last 30 days):
- Business: ${profile.businessName || "—"} (${profile.businessType ?? "n/a"})
- Sells: ${profile.productService ?? "—"}
- Sales total: ${m.totalSalesMmk.toLocaleString()} MMK
- Expenses total: ${m.totalExpensesMmk.toLocaleString()} MMK
- Profit margin: ${m.profitMarginPct.toFixed(1)}%
- Sales trend: ${m.salesTrendPct >= 0 ? "+" : ""}${m.salesTrendPct.toFixed(1)}%
- Avg daily sales: ${m.avgDailySalesMmk.toLocaleString()} MMK
- Outstanding receivables: ${m.outstandingReceivablesMmk.toLocaleString()} MMK
- Top customers: ${top || "—"}
- Customer concentration (top customer share): ${m.customerConcentrationPct.toFixed(1)}%
- Customer segments: ${segments || "—"}
- Competitors: ${competitors}
- Monthly target: ${profile.monthlyTargetMmk?.toLocaleString() ?? "—"} MMK
- Monthly budget: ${profile.budgetMmk?.toLocaleString() ?? "—"} MMK

WHAT THE AI ALREADY SAID ABOUT THIS BUSINESS:
- Headline: ${insights.headline}
- Growth score: ${insights.growthScore}/100  Market score: ${insights.marketScore}/100
- Risk: ${insights.riskLevel} — ${insights.riskReason}
- Top weakness: ${insights.swot.weaknesses[0] ?? "—"}
- Top threat: ${insights.swot.threats[0] ?? "—"}
- Existing recs: promotion="${insights.recommendations.promotion.title}", stock="${insights.recommendations.stock.title}", pricing="${insights.recommendations.pricing.title}", growth="${insights.recommendations.growth.title}"

DECISION THE OWNER IS CONSIDERING:
"${scenario}"

YOUR TASK
Project what is most likely to happen over the next 30–60 days if the owner goes
through with this decision. Be specific and grounded in the numbers above. Output
in Burmese only.

Rules:
- "headline": one Burmese sentence describing the most likely outcome.
- "estimatedImpact.salesPct" and "marginPct": integer % change (positive or negative).
  Be honest — small changes for small actions, larger for major ones. Cap at ±50%
  unless the scenario is clearly transformative.
- "estimatedImpact.risk": "low" | "medium" | "high" — risk level AFTER the change.
- "watchFor": 3 to 5 short Burmese phrases describing concrete signals the owner
  should monitor in the first 30 days to know if it's working.
- "steps": exactly 3 short Burmese action items, ordered, each ≤120 chars,
  concrete and immediately doable.
- "caveats": 0–2 short Burmese sentences describing things that could go wrong.
- Burmese only. No English mixed in except numbers and currency units.
- Do not invent facts not in the input.
`;
}

// ── In-memory cache ──────────────────────────────────────────────────────────
// Keyed by `${workspaceId}:${normalised scenario}`. Free-tier Gemini quotas
// are tight; caching identical queries avoids duplicate API calls within one
// Next.js dev session or lambda instance lifetime.
const _cache = new Map<string, { result: ScenarioProjection; at: number }>();
const CACHE_TTL_MS = 30 * 60_000; // 30 min

// ── Entry point ─────────────────────────────────────────────────────────────

export async function runScenario(
  insights: StrategicInsights,
  profile: ProfileInput,
  scenario: string,
  workspaceId = ""
): Promise<ScenarioProjection> {
  const key = `${workspaceId}:${scenario.trim().toLowerCase()}`;
  const cached = _cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.result;
  }

  const llm = getLLM();
  const result = await llm.structured(buildPrompt(insights, profile, scenario), {
    schema: ScenarioProjection,
    schemaDescription: SCHEMA_DESC,
    retryOnInvalid: true,
    temperature: 0.4,
    maxTokens: 8192,
    workKind: "reasoning",
  });

  _cache.set(key, { result, at: Date.now() });
  // Evict stale entries so the map doesn't grow unbounded.
  if (_cache.size > 100) {
    const cutoff = Date.now() - CACHE_TTL_MS;
    for (const [k, v] of _cache) if (v.at < cutoff) _cache.delete(k);
  }
  return result;
}
