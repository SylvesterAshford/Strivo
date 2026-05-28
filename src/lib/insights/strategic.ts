import { z } from "zod";
import { getLLM } from "@/lib/llm";

// ── Types ───────────────────────────────────────────────────────────────────

export interface FactInput {
  kind: "sale" | "expense" | "receivable" | "note";
  amountMmk: number | null;
  description: string;
  counterparty: string | null;
  occurredAt: Date;
}

export interface ProfileInput {
  businessName: string;
  businessType: string | null;
  productService: string | null;
  location: string | null;
  monthlyTargetMmk: number | null;
  biggestChallenge: string | null;
  budgetMmk: number | null;
  competitors: string[];
}

export interface CustomerSegment {
  key: "loyal" | "occasional" | "oneTime" | "walkIn";
  customers: number;
  totalMmk: number;
}

export interface BusinessMetrics {
  periodDays: number;
  totalSalesMmk: number;
  totalExpensesMmk: number;
  netProfitMmk: number;
  profitMarginPct: number;
  salesTrendPct: number; // recent half vs prior half
  avgDailySalesMmk: number;
  txCount: number;
  outstandingReceivablesMmk: number;
  topCustomers: { name: string; totalMmk: number; count: number }[];
  customerConcentrationPct: number; // top customer share of sales
  expenseRatioPct: number; // expenses / sales
  dailySeries: { date: string; salesMmk: number; expensesMmk: number }[];
  salesForecast: number[]; // projected daily sales, next 7 days
  customerSegments: CustomerSegment[];
}

export interface Recommendation {
  title: string;
  advice: string; // Burmese paragraph
  steps: string[]; // 1-3 simple Burmese action steps
}

export interface Swot {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface StrategicInsights {
  metrics: BusinessMetrics;
  headline: string; // one-line Burmese diagnosis
  growthScore: number; // 0-100
  marketScore: number; // 0-100
  riskLevel: "low" | "medium" | "high";
  riskReason: string; // short Burmese
  swot: Swot;
  forecastNote: string; // short Burmese reading of the forecast
  recommendations: {
    promotion: Recommendation;
    stock: Recommendation;
    pricing: Recommendation;
    growth: Recommendation;
  };
}

// ── Metric computation (deterministic) ──────────────────────────────────────

export function computeMetrics(facts: FactInput[], periodDays = 30): BusinessMetrics {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - periodDays);

  const inWindow = facts.filter((f) => f.occurredAt >= windowStart);

  const sales = inWindow.filter((f) => f.kind === "sale");
  const expenses = inWindow.filter((f) => f.kind === "expense");
  const receivables = inWindow.filter((f) => f.kind === "receivable");

  const totalSalesMmk = sales.reduce((s, f) => s + (f.amountMmk ?? 0), 0);
  const totalExpensesMmk = expenses.reduce((s, f) => s + (f.amountMmk ?? 0), 0);
  const netProfitMmk = totalSalesMmk - totalExpensesMmk;
  const outstandingReceivablesMmk = receivables.reduce((s, f) => s + (f.amountMmk ?? 0), 0);

  // Sales trend: second half vs first half of the window.
  const mid = new Date(now);
  mid.setDate(mid.getDate() - Math.floor(periodDays / 2));
  const recentSales = sales.filter((f) => f.occurredAt >= mid).reduce((s, f) => s + (f.amountMmk ?? 0), 0);
  const priorSales = totalSalesMmk - recentSales;
  const salesTrendPct = priorSales > 0 ? ((recentSales - priorSales) / priorSales) * 100 : recentSales > 0 ? 100 : 0;

  // Top customers by sales.
  const byCustomer = new Map<string, { totalMmk: number; count: number }>();
  for (const f of sales) {
    if (!f.counterparty) continue;
    const cur = byCustomer.get(f.counterparty) ?? { totalMmk: 0, count: 0 };
    cur.totalMmk += f.amountMmk ?? 0;
    cur.count += 1;
    byCustomer.set(f.counterparty, cur);
  }
  const topCustomers = [...byCustomer.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.totalMmk - a.totalMmk)
    .slice(0, 5);

  const customerConcentrationPct =
    totalSalesMmk > 0 && topCustomers.length > 0
      ? (topCustomers[0].totalMmk / totalSalesMmk) * 100
      : 0;

  const expenseRatioPct = totalSalesMmk > 0 ? (totalExpensesMmk / totalSalesMmk) * 100 : 0;
  const profitMarginPct = totalSalesMmk > 0 ? (netProfitMmk / totalSalesMmk) * 100 : 0;

  // Daily series (last 14 days for the trend chart).
  const seriesDays = Math.min(14, periodDays);
  const dailySeries: BusinessMetrics["dailySeries"] = [];
  for (let i = seriesDays - 1; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const daySales = sales
      .filter((f) => f.occurredAt >= day && f.occurredAt < next)
      .reduce((s, f) => s + (f.amountMmk ?? 0), 0);
    const dayExp = expenses
      .filter((f) => f.occurredAt >= day && f.occurredAt < next)
      .reduce((s, f) => s + (f.amountMmk ?? 0), 0);
    dailySeries.push({
      date: day.toISOString().slice(0, 10),
      salesMmk: daySales,
      expensesMmk: dayExp,
    });
  }

  // 7-day sales forecast: project from the recent daily average, sloped by the
  // observed trend. Honest linear projection, not a black-box model.
  const recentAvg = dailySeries.reduce((s, d) => s + d.salesMmk, 0) / Math.max(1, dailySeries.length);
  const trendFactor = Math.max(-0.5, Math.min(0.5, salesTrendPct / 100));
  const salesForecast: number[] = [];
  for (let i = 1; i <= 7; i++) {
    const slope = (recentAvg * trendFactor * i) / 7;
    salesForecast.push(Math.max(0, Math.round(recentAvg + slope)));
  }

  // Customer segmentation by purchase frequency in the window.
  let walkInRevenue = 0;
  for (const f of sales) if (!f.counterparty) walkInRevenue += f.amountMmk ?? 0;
  const seg = { loyal: { c: 0, m: 0 }, occasional: { c: 0, m: 0 }, oneTime: { c: 0, m: 0 } };
  for (const [, v] of byCustomer) {
    const bucket = v.count >= 3 ? seg.loyal : v.count === 2 ? seg.occasional : seg.oneTime;
    bucket.c += 1;
    bucket.m += v.totalMmk;
  }
  const customerSegments: CustomerSegment[] = [
    { key: "loyal", customers: seg.loyal.c, totalMmk: seg.loyal.m },
    { key: "occasional", customers: seg.occasional.c, totalMmk: seg.occasional.m },
    { key: "oneTime", customers: seg.oneTime.c, totalMmk: seg.oneTime.m },
    { key: "walkIn", customers: 0, totalMmk: walkInRevenue },
  ];

  return {
    periodDays,
    totalSalesMmk,
    totalExpensesMmk,
    netProfitMmk,
    profitMarginPct: Math.round(profitMarginPct),
    salesTrendPct: Math.round(salesTrendPct),
    avgDailySalesMmk: Math.round(totalSalesMmk / periodDays),
    txCount: inWindow.length,
    outstandingReceivablesMmk,
    topCustomers,
    customerConcentrationPct: Math.round(customerConcentrationPct),
    expenseRatioPct: Math.round(expenseRatioPct),
    dailySeries,
    salesForecast,
    customerSegments,
  };
}

// ── LLM-generated strategic narrative ───────────────────────────────────────

const RecommendationSchema = z.object({
  title: z.string().min(1).max(40),
  advice: z.string().min(10).max(300),
  steps: z.array(z.string().min(1).max(120)).min(1).max(3),
});

const SwotSchema = z.object({
  strengths: z.array(z.string().min(1).max(100)).min(1).max(3),
  weaknesses: z.array(z.string().min(1).max(100)).min(1).max(3),
  opportunities: z.array(z.string().min(1).max(100)).min(1).max(3),
  threats: z.array(z.string().min(1).max(100)).min(1).max(3),
});

const InsightsSchema = z.object({
  headline: z.string().min(5).max(120),
  growthScore: z.number().int().min(0).max(100),
  marketScore: z.number().int().min(0).max(100),
  riskLevel: z.enum(["low", "medium", "high"]),
  riskReason: z.string().min(5).max(200),
  swot: SwotSchema,
  forecastNote: z.string().min(5).max(200),
  recommendations: z.object({
    promotion: RecommendationSchema,
    stock: RecommendationSchema,
    pricing: RecommendationSchema,
    growth: RecommendationSchema,
  }),
});

const SCHEMA_DESC = `{
  "headline": "one-line plain-Burmese diagnosis of the business right now",
  "growthScore": 0-100 integer (momentum: sales trend, profit, volume),
  "marketScore": 0-100 integer (market potential: customer diversity, repeat customers, demand),
  "riskLevel": "low" | "medium" | "high",
  "riskReason": "short Burmese explanation of the main risk",
  "swot": {
    "strengths":     ["1-3 short Burmese points"],
    "weaknesses":    ["1-3 short Burmese points"],
    "opportunities": ["1-3 short Burmese points"],
    "threats":       ["1-3 short Burmese points"]
  },
  "forecastNote": "short Burmese reading of the 7-day sales forecast",
  "recommendations": {
    "promotion": { "title": "Burmese title", "advice": "Burmese paragraph", "steps": ["Burmese step", ...] },
    "stock":     { "title": "...", "advice": "...", "steps": [...] },
    "pricing":   { "title": "...", "advice": "...", "steps": [...] },
    "growth":    { "title": "...", "advice": "...", "steps": [...] }
  }
}`;

function buildPrompt(m: BusinessMetrics, p: ProfileInput | null): string {
  const fmt = (n: number) => n.toLocaleString("en-US");
  const profileBlock = p
    ? `Business profile:
- Name: ${p.businessName}
- Type: ${p.businessType ?? "unknown"}
- Product/service: ${p.productService ?? "unknown"}
- Location: ${p.location ?? "unknown"}
- Monthly sales target: ${p.monthlyTargetMmk ? fmt(p.monthlyTargetMmk) + " MMK" : "not set"}
- Owner's biggest challenge: ${p.biggestChallenge ?? "not stated"}
- Monthly budget: ${p.budgetMmk ? fmt(p.budgetMmk) + " MMK" : "not set"}
- Competitors: ${p.competitors.length ? p.competitors.join(", ") : "none listed"}`
    : "Business profile: not provided (use metrics only; keep market/SWOT points general).";

  return `You are a strategic business advisor for a Myanmar small business owner (MSME).
Analyze the profile + metrics below and produce an easy-to-understand strategic report.

CRITICAL RULES:
- Write ALL text fields (headline, riskReason, swot, forecastNote, titles, advice, steps) in simple, friendly Burmese (မြန်မာဘာသာ). Short sentences. No jargon.
- Ground every score, SWOT point, and recommendation in the actual numbers + profile given. Do not invent data.
- Action steps must be concrete and doable this week by a small shop owner.
- Scores: be honest. A shrinking, low-margin business should score low.

${profileBlock}

Business metrics (last ${m.periodDays} days):
- Total sales: ${fmt(m.totalSalesMmk)} MMK
- Total expenses: ${fmt(m.totalExpensesMmk)} MMK
- Net profit: ${fmt(m.netProfitMmk)} MMK (margin ${m.profitMarginPct}%)
- Sales trend (recent vs prior half): ${m.salesTrendPct > 0 ? "+" : ""}${m.salesTrendPct}%
- Average daily sales: ${fmt(m.avgDailySalesMmk)} MMK
- Transactions: ${m.txCount}
- Outstanding receivables (money owed to owner): ${fmt(m.outstandingReceivablesMmk)} MMK
- Expense ratio: ${m.expenseRatioPct}% of sales
- Top customer concentration: ${m.customerConcentrationPct}% of sales from one customer
- Top customers: ${m.topCustomers.map((c) => `${c.name} (${fmt(c.totalMmk)} MMK, ${c.count}x)`).join(", ") || "none recorded"}
- 7-day sales forecast (computed): ${m.salesForecast.map(fmt).join(", ")} MMK
- Customer segments: ${m.customerSegments.map((s) => `${s.key}=${s.customers} customers / ${fmt(s.totalMmk)} MMK`).join(", ")}

Produce:
1. headline — the single most important takeaway right now
2. growthScore — momentum (trend + profit + volume)
3. marketScore — market potential (customer base + repeat demand + market/location context)
4. riskLevel + riskReason — biggest risk
5. swot — 1-3 Burmese points each for strengths, weaknesses, opportunities, threats (use profile + competitors + location)
6. forecastNote — plain-Burmese reading of where sales are heading next week
7. recommendations — four categories (title + advice + 1-3 steps):
   - promotion (ပရိုမိုးရှင်း), stock (ကုန်ပစ္စည်း စီမံ), pricing (စျေးနှုန်း), growth (လုပ်ငန်း ကြီးထွားရေး)`;
}

export async function generateInsights(
  facts: FactInput[],
  profile: ProfileInput | null = null,
  periodDays = 30
): Promise<StrategicInsights> {
  const metrics = computeMetrics(facts, periodDays);
  const llm = getLLM();
  const narrative = await llm.structured(buildPrompt(metrics, profile), {
    schema: InsightsSchema,
    schemaDescription: SCHEMA_DESC,
    retryOnInvalid: true,
    temperature: 0.4,
    maxTokens: 8192,
    workKind: "reasoning",
  });

  return { metrics, ...narrative };
}
