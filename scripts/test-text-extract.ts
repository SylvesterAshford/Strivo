// Verify the text-import fact extractor end-to-end against a realistic
// Burmese ledger. Hits Gemini via the same path the /sales/import/text
// route uses (including the Supabase proxy if GEMINI_PROXY_URL is set).
//
// Run: npx tsx --env-file=.env.local scripts/test-text-extract.ts

import { extractFacts } from "@/lib/extraction/mobile-facts";

const LEDGER = `
SALE       မုန့်ဟင်းခါး ၂ ပွဲ                    6000    ကိုအောင်
SALE       ကော်ဖီ + မုန့် အစုံ                   4500    မမေ
SALE       မုန့်ဟင်းခါး လိုက်ပို့                  9000    ဒေါ်အေး
SALE       နံနက်စာ အစုံ                          12000   ဦးကြီး
EXPENSE    ဆန် ၅ ပိဿာ ဝယ်                       15000
EXPENSE    ဆီ ဝယ်                                8000
RECEIVABLE ကိုကျော် ကြွေးကျန်                     12000   ကိုကျော်
NOTE       မနက်ဖြန် ကြက်ဥ ၃၀ လုံး သွင်းရန်
SALE       မုန့်ဟင်းခါး မနက်                    18000   ကိုအောင်
SALE       ကော်ဖီ                              6500
EXPENSE    မီးခ                                 5000
SALE       မုန့်ဟင်းခါး + ကော်ဖီ                  22000   မမေ
SALE       သောက်ဆိုင် လိုက်ပို့                  14000   ဒေါ်အေး
EXPENSE    ဆရာဝန်ဆေး                            4500
SALE       မနက်ဖြန် ရောင်း                      28000   ကိုအောင်
EXPENSE    ဆန် + ဆီ                             22000
SALE       မနက်ပိုင်း အားလုံး                   31000   ဒေါ်အေး
EXPENSE    ဆိုင်ခ                                50000
SALE       တနင်္ဂနွေ ရောင်း                     35000   ကိုကျော်
SALE       ပွဲကြီး အထူး ရောင်း                  45000
SALE       လိုက်ပို့ ဆောင်                       14000   မမေ
EXPENSE    ပစ္စည်းသွင်း                          18000
RECEIVABLE မမေ နောက်လ ပေးမည်                    20000   မမေ
NOTE       ပြိုင်ဘက်ဆိုင် မုန့်ဟင်းခါး ၂၂၀၀ တင်
SALE       အပတ်စဉ် ပျမ်းမျှ                    24000   ဦးကြီး
EXPENSE    ဝန်ထမ်း လုပ်ခ                         80000
`.trim();

async function main() {
  console.log("📝 input length:", LEDGER.length, "chars,", LEDGER.split("\n").length, "lines");
  console.log("⏳ calling extractFacts() — this goes through the Supabase proxy if configured…");
  console.log("   GEMINI_PROXY_URL =", process.env.GEMINI_PROXY_URL ? "set" : "not set");
  console.log();

  const t0 = Date.now();
  let facts;
  try {
    facts = await extractFacts(LEDGER);
  } catch (err) {
    console.error("❌ extractFacts threw:", err);
    process.exit(1);
  }
  const elapsedSec = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`✓ extracted ${facts.length} facts in ${elapsedSec}s`);
  console.log();

  // Counts per kind
  const byKind = facts.reduce<Record<string, number>>((acc, f) => {
    acc[f.kind] = (acc[f.kind] ?? 0) + 1;
    return acc;
  }, {});
  console.log("  by kind:", byKind);

  const totalSaleMmk = facts
    .filter((f) => f.kind === "sale")
    .reduce((s, f) => s + (f.amountMmk ?? 0), 0);
  const totalExpenseMmk = facts
    .filter((f) => f.kind === "expense")
    .reduce((s, f) => s + (f.amountMmk ?? 0), 0);
  console.log(`  sales total   : ${totalSaleMmk.toLocaleString()} MMK`);
  console.log(`  expense total : ${totalExpenseMmk.toLocaleString()} MMK`);
  console.log();

  console.log("first 5 extracted facts:");
  facts.slice(0, 5).forEach((f, i) => {
    console.log(
      `  ${i + 1}. [${f.kind}] ${f.description}` +
        (f.amountMmk ? ` — ${f.amountMmk}` : "") +
        (f.counterparty ? ` (${f.counterparty})` : "")
    );
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
