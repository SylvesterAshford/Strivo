/**
 * Seed the database with realistic Myanmar MSME dummy data for the dev bypass user.
 * Idempotent — safe to re-run; existing rows are skipped.
 *
 * Run: npx tsx scripts/seed-dev.ts
 */

import { db } from "@/db/client";
import { users, workspaces, facts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { regenerateInsights } from "@/lib/insights/cache";

const DEV_USER_ID = "dev_local_user";
const DEV_USER_EMAIL = "dev@local.lattice";
const DEV_WORKSPACE_ID = "ws_dev_local";

// ── helpers ──────────────────────────────────────────────────────────────────

let factSeq = 0;
function factId() {
  return `fact_dev_${String(++factSeq).padStart(4, "0")}`;
}

function daysAgo(n: number, hour = 10, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function today(hour: number, minute = 0): Date {
  return daysAgo(0, hour, minute);
}

// ── user + workspace ──────────────────────────────────────────────────────────

async function ensureUser() {
  await db
    .insert(users)
    .values({ id: DEV_USER_ID, email: DEV_USER_EMAIL })
    .onConflictDoNothing();

  await db
    .insert(workspaces)
    .values({
      id: DEV_WORKSPACE_ID,
      ownerId: DEV_USER_ID,
      name: "မင်း ဘုန်းဆန်း ဆိုင်",
      businessDescription: "မြို့ပေါ် မုန့်ဟင်းခါးဆိုင်",
    })
    .onConflictDoNothing();

  // Always (re)apply the profile so AI insights stay specific and the
  // Business Profile screen has something to show on fresh DBs.
  await db
    .update(workspaces)
    .set({
      businessType: "fnb",
      productService: "မုန့်ဟင်းခါး၊ ကော်ဖီ၊ မနက်စာ",
      location: "ရန်ကုန်၊ မြောက်ဥက္ကလာ",
      monthlyTargetMmk: 1_500_000,
      biggestChallenge: "ရောင်းအား မညီမှု၊ ဖောက်သည် မမှန်ခြင်း",
      budgetMmk: 200_000,
      competitors: ["ဦးကြီး မုန့်ဟင်းခါး", "ရတနာ ကော်ဖီ"],
    })
    .where(eq(workspaces.id, DEV_WORKSPACE_ID));
}

// ── fact rows ─────────────────────────────────────────────────────────────────

type FactRow = {
  id: string;
  workspaceId: string;
  recordingId: null;
  kind: "sale" | "expense" | "receivable" | "note";
  amountMmk: number | null;
  description: string;
  counterparty: string | null;
  occurredAt: Date;
  createdAt: Date;
};

function row(
  kind: FactRow["kind"],
  description: string,
  amountMmk: number | null,
  occurredAt: Date,
  counterparty?: string
): FactRow {
  return {
    id: factId(),
    workspaceId: DEV_WORKSPACE_ID,
    recordingId: null,
    kind,
    amountMmk,
    description,
    counterparty: counterparty ?? null,
    occurredAt,
    createdAt: occurredAt,
  };
}

function buildFacts(): FactRow[] {
  const rows: FactRow[] = [];

  // ── TODAY — populates Home hero + recent entries ──────────────────────────
  rows.push(row("sale",       "မုန့်ဟင်းခါး ၂ ပွဲ",          6_000,  today(7, 30),  "ကိုအောင်"));
  rows.push(row("sale",       "ကော်ဖီ + မုန့် အစုံ",          4_500,  today(8, 0),   "မမေ"));
  rows.push(row("sale",       "မုန့်ဟင်းခါး လိုက်ပို့",        9_000,  today(9, 15),  "ဒေါ်အေး"));
  rows.push(row("expense",    "ဆန် ၅ ပိဿာ ဝယ်",              15_000, today(6, 0)));
  rows.push(row("expense",    "ဆီ ဝယ်",                       8_000,  today(6, 30)));
  rows.push(row("receivable", "ကိုကျော် ကြွေးကျန်",            12_000, today(10, 0),  "ကိုကျော်"));
  rows.push(row("note",       "မနက်ဖြန် ကြက်ဥ သွင်းဖို့ မမေ့ပါနဲ့", null, today(11, 0)));

  // ── DAY -1 ─────────────────────────────────────────────────────────────────
  rows.push(row("sale",    "မုန့်ဟင်းခါး မနက်",    18_000, daysAgo(1, 7),  "ကိုအောင်"));
  rows.push(row("sale",    "ကော်ဖီ",               6_500,  daysAgo(1, 8)));
  rows.push(row("expense", "မီးဖိုခ",              5_000,  daysAgo(1, 9)));

  // ── DAY -2 ─────────────────────────────────────────────────────────────────
  rows.push(row("sale",    "မုန့်ဟင်းခါး + ကော်ဖီ", 22_000, daysAgo(2, 8),  "မမေ"));
  rows.push(row("sale",    "သောက်ဆိုင် လိုက်ပို့",   14_000, daysAgo(2, 11), "ဒေါ်အေး"));
  rows.push(row("expense", "ဆရာဝန်ဆေး",            4_500,  daysAgo(2, 14)));

  // ── DAY -3 ─────────────────────────────────────────────────────────────────
  rows.push(row("sale",       "မနက်ဖြန် ရောင်း",   28_000, daysAgo(3, 9),  "ကိုအောင်"));
  rows.push(row("expense",    "ဆန် + ဆီ",          22_000, daysAgo(3, 6)));
  rows.push(row("receivable", "မမေ ကြွေးကျန်",       8_000,  daysAgo(3, 10), "မမေ"));

  // ── DAY -4 ─────────────────────────────────────────────────────────────────
  rows.push(row("sale",    "မနက်ပိုင်း အားလုံး",  31_000, daysAgo(4, 8),  "ဒေါ်အေး"));
  rows.push(row("expense", "ရေမီး",              7_500,  daysAgo(4, 15)));
  rows.push(row("expense", "ဆိုင်ခ",            50_000, daysAgo(4, 17)));

  // ── DAY -5 ─────────────────────────────────────────────────────────────────
  rows.push(row("sale",    "မနက်ဖြန် ရောင်း",   25_000, daysAgo(5, 9)));
  rows.push(row("expense", "ငရုတ်သီး + ကြက်ဥ",   6_000,  daysAgo(5, 7)));

  // ── DAY -6 (one week ago) ─────────────────────────────────────────────────
  rows.push(row("sale",    "တနင်္ဂနွေ ရောင်း",   35_000, daysAgo(6, 8),  "ကိုကျော်"));
  rows.push(row("expense", "ဈေးသွင်း",           18_000, daysAgo(6, 6)));

  // ── OLDER DATA (days -7 to -30) for Analytics 30-day window ───────────────
  const customers = ["ကိုအောင်", "မမေ", "ဒေါ်အေး", "ကိုကျော်", null];
  const saleDescs = ["မုန့်ဟင်းခါး", "ကော်ဖီ အစုံ", "မနက်ဖြန် ရောင်း", "လိုက်ပို့ ဆောင်"];
  const expDescs  = ["ဆန် ဝယ်", "ဆီ ဝယ်", "ဆိုင်ခ", "ရေမီး", "ပစ္စည်းသွင်း"];

  for (let d = 7; d <= 30; d++) {
    const salesCount = 1 + (d % 3);
    const expCount   = 1 + (d % 2);

    for (let s = 0; s < salesCount; s++) {
      const amt = (8 + ((d * 3 + s * 7) % 30)) * 1_000;
      const cp  = customers[(d + s) % customers.length];
      const desc = saleDescs[(d + s) % saleDescs.length];
      rows.push(row("sale", desc, amt, daysAgo(d, 8 + s), cp ?? undefined));
    }

    for (let e = 0; e < expCount; e++) {
      const amt = (5 + ((d * 2 + e * 4) % 20)) * 1_000;
      const desc = expDescs[(d + e) % expDescs.length];
      rows.push(row("expense", desc, amt, daysAgo(d, 6 + e)));
    }
  }

  return rows;
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding dev data...");

  await ensureUser();
  console.log("  ✓ dev user + workspace");

  // Wipe existing dev facts so re-runs don't double up.
  await db.delete(facts).where(eq(facts.workspaceId, DEV_WORKSPACE_ID));
  console.log("  ✓ cleared old dev facts");

  const rows = buildFacts();
  await db.insert(facts).values(rows);
  console.log(`  ✓ inserted ${rows.length} facts`);

  const todayCount = rows.filter((r) => {
    const now = new Date();
    return r.occurredAt.toDateString() === now.toDateString();
  }).length;

  console.log(`
  Total facts : ${rows.length}
  Today       : ${todayCount} entries
  Date range  : ${rows[rows.length - 1].occurredAt.toDateString()} → today
`);

  // Pre-warm the strategic-insights cache so Analytics opens instantly.
  // This calls Gemini once (~15-30s) but every subsequent app open is ~50ms.
  console.log("  ⏳ pre-warming AI insights cache (one-time Gemini call)...");
  const t0 = Date.now();
  try {
    await regenerateInsights(DEV_WORKSPACE_ID);
    console.log(`  ✓ insights cached in ${Math.round((Date.now() - t0) / 1000)}s`);
  } catch (err) {
    console.warn("  ⚠ insights pre-warm failed (Analytics will warm on first open):", err);
  }

  console.log(`
Done!

What you'll see:
  Home       → hero metric + ${todayCount} recent entries + alert chips
  Reports    → 7-day bar chart, month totals, top customers, category breakdown
  Analytics  → cached SWOT, forecast, recommendations (instant load)
  `);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
