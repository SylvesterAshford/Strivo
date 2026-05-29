// Hit the scenario projector end-to-end with a dummy insights blob.
// Verifies prompt + Zod + Gemini proxy path without needing the API route up.
//
// Run: npx tsx --env-file=.env.local scripts/test-scenario.ts

import { runScenario } from "@/lib/insights/scenario";
import type { StrategicInsights, ProfileInput } from "@/lib/insights/strategic";

const PROFILE: ProfileInput = {
  businessName: "မင်း ဘုန်းဆန်း ဆိုင်",
  businessType: "fnb",
  productService: "မုန့်ဟင်းခါး၊ ကော်ဖီ၊ မနက်စာ",
  location: "ရန်ကုန်",
  monthlyTargetMmk: 1_500_000,
  biggestChallenge: "ရောင်းအား မညီမှု",
  budgetMmk: 200_000,
  competitors: ["ဦးကြီး မုန့်ဟင်းခါး", "ရတနာ ကော်ဖီ"],
};

const INSIGHTS: StrategicInsights = {
  metrics: {
    periodDays: 30,
    totalSalesMmk: 1_142_000,
    totalExpensesMmk: 580_500,
    netProfitMmk: 561_500,
    profitMarginPct: 49.2,
    salesTrendPct: 8.4,
    avgDailySalesMmk: 38_066,
    txCount: 87,
    outstandingReceivablesMmk: 20_000,
    topCustomers: [
      { name: "ကိုအောင်", totalMmk: 412_000, count: 17 },
      { name: "မမေ", totalMmk: 254_000, count: 11 },
      { name: "ဒေါ်အေး", totalMmk: 198_000, count: 9 },
    ],
    customerConcentrationPct: 36.1,
    expenseRatioPct: 50.8,
    dailySeries: [],
    salesForecast: [40_000, 38_000, 42_000, 39_000, 41_000, 37_000, 43_000],
    customerSegments: [
      { key: "loyal", customers: 4, totalMmk: 720_000 },
      { key: "occasional", customers: 7, totalMmk: 280_000 },
      { key: "oneTime", customers: 12, totalMmk: 142_000 },
      { key: "walkIn", customers: 25, totalMmk: 0 },
    ],
  },
  headline: "ပုံမှန် ဖောက်သည် ပိုရှာရန် လိုပါသည်",
  growthScore: 64,
  marketScore: 52,
  riskLevel: "medium",
  riskReason: "ထိပ်တန်း ဖောက်သည် ၁ ဦးက ရောင်းအား ၃၆% ပါ",
  swot: {
    strengths: ["ပုံမှန် ဖောက်သည် ၄ ဦးရှိ", "အမြတ်ရာခိုင်နှုန်း ၄၉%"],
    weaknesses: ["ဖောက်သည် အသစ် နည်း"],
    opportunities: ["မနက်စာ စျေးကွက် တိုးနိုင်"],
    threats: ["ပြိုင်ဘက် ၂ ဆိုင် နီးပါး"],
  },
  forecastNote: "လာမည့် ၇ ရက် ၂၈၀,၀၀၀ ခန့်",
  recommendations: {
    promotion: { title: "Loyalty card", advice: "ပုံမှန် ဖောက်သည်အတွက် ပြုလုပ်ပါ", steps: ["1", "2", "3"] },
    stock: { title: "ဆန် တိုးသွင်း", advice: "", steps: ["1", "2", "3"] },
    pricing: { title: "မနက်စာ ဆက်စပ်", advice: "", steps: ["1", "2", "3"] },
    growth: { title: "မနက်ပိုင်း ဦးတည်", advice: "", steps: ["1", "2", "3"] },
  },
};

const SCENARIO = "ဈေးနှုန်း ၁၀% လျှော့လိုက်ရင် ဘယ်လို ဖြစ်မလဲ";

async function main() {
  console.log("⏳ runScenario() — calls Gemini via proxy if GEMINI_PROXY_URL is set");
  console.log("   GEMINI_PROXY_URL =", process.env.GEMINI_PROXY_URL ? "set" : "not set");
  console.log("   scenario:", SCENARIO);
  console.log();

  const t0 = Date.now();
  const result = await runScenario(INSIGHTS, PROFILE, SCENARIO);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`✓ scenario projected in ${elapsed}s`);
  console.log();
  console.log("headline:        ", result.headline);
  console.log("impact (sales):  ", result.estimatedImpact.salesPct >= 0 ? "+" : "", result.estimatedImpact.salesPct, "%");
  console.log("impact (margin): ", result.estimatedImpact.marginPct >= 0 ? "+" : "", result.estimatedImpact.marginPct, "%");
  console.log("risk:            ", result.estimatedImpact.risk);
  console.log();
  console.log("watchFor:");
  result.watchFor.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
  console.log();
  console.log("steps:");
  result.steps.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  if (result.caveats.length) {
    console.log();
    console.log("caveats:");
    result.caveats.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
