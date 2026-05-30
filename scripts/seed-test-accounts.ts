import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { facts, workspaces, users } from "@/db/schema";
import { createId } from "@/lib/id";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DB_URL = process.env.DATABASE_URL_OWNER ?? process.env.DATABASE_URL!;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Use a fresh postgres connection (NOT the @/db/client) so we can point at
// the owner role explicitly without coupling to whatever DATABASE_URL the
// running app uses.
const client = postgres(DB_URL, { prepare: false, max: 4 });
const db = drizzle(client, { schema });

// ── Profile definitions ─────────────────────────────────────────────────────

interface ProfileSpec {
  email: string;
  password: string;
  businessName: string;
  businessType: string;
  productService: string;
  location: string;
  monthlyTargetMmk: number;
  biggestChallenge: string;
  monthlyExpensesMmk: number;
  posEnabled: boolean;
  salesPeriods: ("daily" | "weekly" | "monthly" | "yearly")[];
  salesValues: Partial<Record<"daily" | "weekly" | "monthly" | "yearly", number>>;
  competitors: string[];
  competitorDetails: { name: string; tier: "discount" | "matcher" | "premium"; audience: string }[];
  customersSeed: string[];
  productsSeed: { name: string; priceMmk?: number }[];
  suppliersSeed: { name: string; supplies?: string }[];
  expensesSeed: { category: string; monthlyMmk?: number }[];
  // Fact recipes used to materialize 4-6 weeks of activity.
  saleProducts: { product: string; priceMmk: number; customer?: string; weight: number }[];
  expenseRecipes: { description: string; category: string; counterparty?: string; amountMmk: number; cadence: "daily" | "weekly" | "monthly" }[];
  receivables: { description: string; counterparty: string; amountMmk: number }[];
}

const tea: ProfileSpec = {
  email: "shop1@strivo.test",
  password: "ShopOne!2026",
  businessName: "မိုးအိမ်လက်ဖက်ရည်ဆိုင်",
  businessType: "retail",
  productService: "လက်ဖက်ရည်၊ ကော်ဖီ၊ ထမင်းကြော်နှင့် ပလာတာ",
  location: "ရန်ကုန် (အင်းစိန်)",
  monthlyTargetMmk: 3_000_000,
  biggestChallenge: "ပစ္စည်းဈေးတက်နေခြင်း — ဆန်နှင့်ဆီ ဈေးက လစဉ်ဖော်တင်",
  monthlyExpensesMmk: 1_800_000,
  posEnabled: false,
  salesPeriods: ["daily"],
  salesValues: { daily: 110_000 },
  competitors: ["ရွှေအိုးလက်ဖက်ရည်", "ပန်းကုန်းမုန့်ဆိုင်"],
  competitorDetails: [
    { name: "ရွှေအိုးလက်ဖက်ရည်", tier: "matcher", audience: "ရပ်ကွက်ထဲ မိသားစုများ" },
    { name: "ပန်းကုန်းမုန့်ဆိုင်", tier: "discount", audience: "ကျောင်းသား" },
  ],
  customersSeed: ["ဦးအောင်ကြီး", "ဒေါ်အေး", "ကိုထွန်း", "မမေ", "ဦးကျော်", "ဆရာမသန်းသန်း", "ကိုဇော်", "မရီ"],
  productsSeed: [
    { name: "လက်ဖက်ရည် (၁ ခွက်)", priceMmk: 700 },
    { name: "ကော်ဖီ", priceMmk: 1_000 },
    { name: "ပလာတာ", priceMmk: 1_500 },
    { name: "ထမင်းကြော်", priceMmk: 2_500 },
    { name: "မုန့်ဟင်းခါး", priceMmk: 2_000 },
    { name: "စမူဆာ (၂ လုံး)", priceMmk: 1_200 },
  ],
  suppliersSeed: [
    { name: "ရွှေပြည်ဆန်ဆိုင်", supplies: "ဆန်နှင့်ဆီ" },
    { name: "ဦးကြီးထီး", supplies: "လက်ဖက်နှင့်နို့" },
    { name: "မိုးဦးပန်း", supplies: "မုန့်အသင့်ပြုလုပ်ပြီး" },
  ],
  expensesSeed: [
    { category: "ဆိုင်ခ", monthlyMmk: 300_000 },
    { category: "လုပ်ခ", monthlyMmk: 600_000 },
    { category: "ပစ္စည်းသွင်း", monthlyMmk: 700_000 },
    { category: "မီးခ", monthlyMmk: 80_000 },
    { category: "ရေခ", monthlyMmk: 20_000 },
    { category: "သယ်ယူခ", monthlyMmk: 100_000 },
  ],
  saleProducts: [
    { product: "လက်ဖက်ရည် × ၅", priceMmk: 3_500, weight: 5 },
    { product: "ကော်ဖီ × ၃", priceMmk: 3_000, weight: 3 },
    { product: "ပလာတာ × ၄", priceMmk: 6_000, customer: "ဦးအောင်ကြီး", weight: 2 },
    { product: "မုန့်ဟင်းခါး × ၂", priceMmk: 4_000, customer: "ဒေါ်အေး", weight: 2 },
    { product: "ထမင်းကြော် × ၁", priceMmk: 2_500, customer: "ကိုထွန်း", weight: 3 },
    { product: "စမူဆာ × ၂", priceMmk: 1_200, weight: 4 },
    { product: "လက်ဖက်ရည် × ၁၀ (ပါတီ)", priceMmk: 7_000, customer: "ဆရာမသန်းသန်း", weight: 1 },
  ],
  expenseRecipes: [
    { description: "ဆိုင်ခ လစဉ်ပေး", category: "ဆိုင်ခ", counterparty: "ဦးထွန်းမြ", amountMmk: 300_000, cadence: "monthly" },
    { description: "လုပ်ခ (၂ ယောက်) ၁၅ ရက်", category: "လုပ်ခ", amountMmk: 200_000, cadence: "weekly" },
    { description: "ဆန်နှင့်ဆီ ဝယ်", category: "ပစ္စည်းသွင်း", counterparty: "ရွှေပြည်ဆန်ဆိုင်", amountMmk: 80_000, cadence: "weekly" },
    { description: "လက်ဖက်နှင့်နို့ ဝယ်", category: "ပစ္စည်းသွင်း", counterparty: "ဦးကြီးထီး", amountMmk: 60_000, cadence: "weekly" },
    { description: "မီးခ လစဉ်", category: "မီးခ", amountMmk: 80_000, cadence: "monthly" },
    { description: "ရေခ လစဉ်", category: "ရေခ", amountMmk: 20_000, cadence: "monthly" },
    { description: "သယ်ယူခ ၁ ပတ်", category: "သယ်ယူခ", amountMmk: 25_000, cadence: "weekly" },
  ],
  receivables: [
    { description: "ပါတီ မုန့်ဖိုး", counterparty: "ဆရာမသန်းသန်း", amountMmk: 35_000 },
    { description: "နံနက်စာ ၃ ရက်", counterparty: "ကိုဇော်", amountMmk: 15_000 },
  ],
};

const phone: ProfileSpec = {
  email: "shop2@strivo.test",
  password: "ShopTwo!2026",
  businessName: "မြို့မဖုန်းပြင်ဆိုင်",
  businessType: "services",
  productService: "ဖုန်းပြုပြင်ခြင်း၊ မျက်နှာပြင်လဲ၊ ဘက်ထရီလဲ၊ ဆက်စပ်ပစ္စည်းရောင်း",
  location: "မန္တလေး (၈၄ လမ်း)",
  monthlyTargetMmk: 2_500_000,
  biggestChallenge: "မျက်နှာပြင် မူရင်းပစ္စည်းရှားပါးခြင်း",
  monthlyExpensesMmk: 1_300_000,
  posEnabled: false,
  salesPeriods: ["daily", "weekly"],
  salesValues: { daily: 80_000, weekly: 560_000 },
  competitors: ["စိန်ပန်းဖုန်းပြင်", "Maw Tin Mobile"],
  competitorDetails: [
    { name: "စိန်ပန်းဖုန်းပြင်", tier: "matcher", audience: "လမ်းမတန်း ဖောက်သည်" },
    { name: "Maw Tin Mobile", tier: "premium", audience: "iPhone သုံးသူ" },
  ],
  customersSeed: ["ကိုနိုင်", "မဖူး", "ဆရာမသန်း", "ကိုကို", "ဦးညွန့်", "မိုးပြည့်", "ကိုခိုင်"],
  productsSeed: [
    { name: "မျက်နှာပြင်လဲ - Samsung A", priceMmk: 60_000 },
    { name: "မျက်နှာပြင်လဲ - iPhone X", priceMmk: 150_000 },
    { name: "ဘက်ထရီလဲ", priceMmk: 35_000 },
    { name: "Charging cable", priceMmk: 8_000 },
    { name: "ဖုန်းအိမ်", priceMmk: 5_000 },
    { name: "Charger 25W", priceMmk: 18_000 },
    { name: "Tempered glass", priceMmk: 7_000 },
  ],
  suppliersSeed: [
    { name: "ရန်ကုန် Mobile Parts", supplies: "မျက်နှာပြင် + ဘက်ထရီ" },
    { name: "မန္တလေး Accessory", supplies: "ဖုန်းအိမ်/Cable" },
  ],
  expensesSeed: [
    { category: "ဆိုင်ခ", monthlyMmk: 250_000 },
    { category: "လုပ်ခ", monthlyMmk: 400_000 },
    { category: "ပစ္စည်းသွင်း", monthlyMmk: 500_000 },
    { category: "မီးခ", monthlyMmk: 70_000 },
    { category: "သယ်ယူခ", monthlyMmk: 80_000 },
  ],
  saleProducts: [
    { product: "မျက်နှာပြင်လဲ - Samsung A", priceMmk: 60_000, customer: "ကိုနိုင်", weight: 3 },
    { product: "မျက်နှာပြင်လဲ - iPhone X", priceMmk: 150_000, customer: "မဖူး", weight: 1 },
    { product: "ဘက်ထရီလဲ", priceMmk: 35_000, weight: 4 },
    { product: "Charging cable", priceMmk: 8_000, weight: 6 },
    { product: "Charger 25W", priceMmk: 18_000, weight: 2 },
    { product: "ဖုန်းအိမ် + Tempered glass", priceMmk: 12_000, weight: 5 },
    { product: "Software flash + လုပ်ခ", priceMmk: 15_000, weight: 3 },
  ],
  expenseRecipes: [
    { description: "ဆိုင်ခ လစဉ်ပေး", category: "ဆိုင်ခ", counterparty: "ဦးတင်ဝင်း", amountMmk: 250_000, cadence: "monthly" },
    { description: "လုပ်သားလချ", category: "လုပ်ခ", amountMmk: 200_000, cadence: "weekly" },
    { description: "Mobile parts shipment", category: "ပစ္စည်းသွင်း", counterparty: "ရန်ကုန် Mobile Parts", amountMmk: 200_000, cadence: "weekly" },
    { description: "Accessory restock", category: "ပစ္စည်းသွင်း", counterparty: "မန္တလေး Accessory", amountMmk: 80_000, cadence: "weekly" },
    { description: "မီးခ", category: "မီးခ", amountMmk: 70_000, cadence: "monthly" },
    { description: "Delivery + ပို့", category: "သယ်ယူခ", amountMmk: 20_000, cadence: "weekly" },
  ],
  receivables: [
    { description: "iPhone X မျက်နှာပြင် (နောက်မှပေး)", counterparty: "မဖူး", amountMmk: 75_000 },
    { description: "Battery × ၂ (လုပ်ငန်းရှင်)", counterparty: "ဦးညွန့်", amountMmk: 70_000 },
  ],
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function jitterAmount(base: number, pct = 0.15): number {
  const delta = (Math.random() * 2 - 1) * pct;
  return Math.max(0, Math.round(base * (1 + delta)));
}

interface FactInput {
  workspaceId: string;
  kind: "sale" | "expense" | "receivable";
  amountMmk: number | null;
  description: string;
  counterparty: string | null;
  category: string | null;
  occurredAt: Date;
}

/** Build ~30 days of activity for a workspace. */
function buildFacts(spec: ProfileSpec, workspaceId: string): FactInput[] {
  const out: FactInput[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // === Sales: 4-7 transactions per day × 30 days ===
  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const day = new Date(today);
    day.setDate(day.getDate() - dayOffset);
    const txCount = 4 + Math.floor(Math.random() * 4); // 4..7

    // Build a weighted sale pool
    const pool: typeof spec.saleProducts = [];
    for (const p of spec.saleProducts) {
      for (let i = 0; i < p.weight; i++) pool.push(p);
    }

    for (let i = 0; i < txCount; i++) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      const hour = 6 + Math.floor(Math.random() * 14);
      const minute = Math.floor(Math.random() * 60);
      const ts = new Date(day);
      ts.setHours(hour, minute, 0, 0);

      out.push({
        workspaceId,
        kind: "sale",
        amountMmk: jitterAmount(pick.priceMmk, 0.1),
        description: pick.product,
        counterparty: pick.customer ?? null,
        category: null,
        occurredAt: ts,
      });
    }
  }

  // === Expenses: cadence-driven ===
  for (const recipe of spec.expenseRecipes) {
    if (recipe.cadence === "monthly") {
      const ts = new Date(today);
      ts.setDate(5);
      out.push({
        workspaceId,
        kind: "expense",
        amountMmk: recipe.amountMmk,
        description: recipe.description,
        counterparty: recipe.counterparty ?? null,
        category: recipe.category,
        occurredAt: ts,
      });
    } else if (recipe.cadence === "weekly") {
      for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
        const ts = new Date(today);
        ts.setDate(ts.getDate() - weekOffset * 7 - 1);
        ts.setHours(14, 0, 0, 0);
        out.push({
          workspaceId,
          kind: "expense",
          amountMmk: jitterAmount(recipe.amountMmk, 0.08),
          description: recipe.description,
          counterparty: recipe.counterparty ?? null,
          category: recipe.category,
          occurredAt: ts,
        });
      }
    } else {
      // daily — every 2nd day
      for (let dayOffset = 28; dayOffset >= 0; dayOffset -= 2) {
        const ts = new Date(today);
        ts.setDate(ts.getDate() - dayOffset);
        ts.setHours(10, 0, 0, 0);
        out.push({
          workspaceId,
          kind: "expense",
          amountMmk: jitterAmount(recipe.amountMmk, 0.1),
          description: recipe.description,
          counterparty: recipe.counterparty ?? null,
          category: recipe.category,
          occurredAt: ts,
        });
      }
    }
  }

  // === Receivables: each open-ended ===
  for (const r of spec.receivables) {
    const ts = new Date(today);
    ts.setDate(ts.getDate() - Math.floor(Math.random() * 14));
    out.push({
      workspaceId,
      kind: "receivable",
      amountMmk: r.amountMmk,
      description: r.description,
      counterparty: r.counterparty,
      category: null,
      occurredAt: ts,
    });
  }

  return out;
}

// ── Seeding ─────────────────────────────────────────────────────────────────

async function purgeExistingTestAccount(email: string) {
  // 1) Find Supabase auth user.
  const { data: list, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  const found = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!found) return;

  // 2) Delete app DB rows (cascade removes workspace/facts).
  await db.delete(users).where(sql`${users.id} = ${found.id}`);

  // 3) Delete the Supabase auth row.
  await admin.auth.admin.deleteUser(found.id);
  console.log(`  purged previous ${email}`);
}

async function seedAccount(spec: ProfileSpec) {
  console.log(`\n=== Seeding ${spec.email} ===`);
  await purgeExistingTestAccount(spec.email);

  // 1) Supabase auth user
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: spec.email,
    password: spec.password,
    email_confirm: true,
    user_metadata: { seeded: true },
  });
  if (createErr || !created.user) {
    throw new Error(`createUser failed: ${createErr?.message ?? "no user"}`);
  }
  const userId = created.user.id;
  console.log(`  auth user: ${userId}`);

  // 2) DB user + workspace
  const workspaceId = `ws_${createId()}`;
  await db.insert(users).values({ id: userId, email: spec.email });
  await db.insert(workspaces).values({
    id: workspaceId,
    ownerId: userId,
    name: spec.businessName,
    businessType: spec.businessType,
    productService: spec.productService,
    location: spec.location,
    monthlyTargetMmk: spec.monthlyTargetMmk,
    biggestChallenge: spec.biggestChallenge,
    budgetMmk: spec.monthlyExpensesMmk,
    posEnabled: spec.posEnabled,
    salesPeriods: spec.salesPeriods,
    salesValues: spec.salesValues,
    monthlyExpensesMmk: spec.monthlyExpensesMmk,
    competitors: spec.competitors,
    competitorDetails: spec.competitorDetails,
    customersSeed: spec.customersSeed,
    productsSeed: spec.productsSeed,
    suppliersSeed: spec.suppliersSeed,
    expensesSeed: spec.expensesSeed,
  });
  console.log(`  workspace: ${workspaceId}`);

  // 3) Facts
  const factRows = buildFacts(spec, workspaceId).map((f) => ({
    id: `fact_${createId()}`,
    workspaceId: f.workspaceId,
    recordingId: null,
    kind: f.kind,
    amountMmk: f.amountMmk,
    description: f.description,
    counterparty: f.counterparty,
    category: f.category,
    occurredAt: f.occurredAt,
    createdAt: new Date(),
  }));
  // Batch insert in chunks of 100 to keep payload small.
  for (let i = 0; i < factRows.length; i += 100) {
    await db.insert(facts).values(factRows.slice(i, i + 100));
  }
  console.log(`  facts inserted: ${factRows.length}`);

  // Breakdown by kind for the summary
  const byKind = factRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.kind] = (acc[r.kind] ?? 0) + 1;
    return acc;
  }, {});
  return {
    email: spec.email,
    password: spec.password,
    userId,
    workspaceId,
    businessName: spec.businessName,
    location: spec.location,
    monthlyTargetMmk: spec.monthlyTargetMmk,
    monthlyExpensesMmk: spec.monthlyExpensesMmk,
    factCount: factRows.length,
    byKind,
    expensesSeed: spec.expensesSeed,
    productsSeed: spec.productsSeed,
  };
}

async function main() {
  const results = [];
  for (const spec of [tea, phone]) {
    results.push(await seedAccount(spec));
  }

  console.log("\n\n========== SEED SUMMARY ==========");
  for (const r of results) {
    console.log(`\n${r.businessName}`);
    console.log(`  email      : ${r.email}`);
    console.log(`  password   : ${r.password}`);
    console.log(`  location   : ${r.location}`);
    console.log(`  target/mo  : ${r.monthlyTargetMmk.toLocaleString()} MMK`);
    console.log(`  expenses/mo: ${r.monthlyExpensesMmk.toLocaleString()} MMK`);
    console.log(`  workspace  : ${r.workspaceId}`);
    console.log(`  facts      : ${r.factCount} (${Object.entries(r.byKind).map(([k, v]) => `${k}:${v}`).join(", ")})`);
    console.log(`  expense categories: ${r.expensesSeed.map((e) => e.category).join(", ")}`);
    console.log(`  top products:     ${r.productsSeed.slice(0, 4).map((p) => p.name).join(", ")}`);
  }
  console.log("\n==================================\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
