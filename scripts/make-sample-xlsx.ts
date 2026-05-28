import * as XLSX from "xlsx";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

// Realistic-ish Myanmar MSME sales ledger: ~40 rows across April + May 2026.
// Mixed Burmese product/customer names, mixed clean and slightly-messy values,
// to exercise the LLM column-detection prompt.

interface Row {
  date: string;        // 2026-04-12 style or 12/4/2026 — mixed on purpose
  customer: string;    // empty for walk-ins
  product: string;
  qty: number | "";
  amount: number;
}

const CUSTOMERS = ["ကိုအောင်", "မမေ", "ဒေါ်အေး", "ကိုကျော်", "ဦးကြီး", "", "", "", "ဆရာမ", "မမြ"];
const PRODUCTS = [
  { name: "မုန့်ဟင်းခါး", unit: 3000 },
  { name: "ကော်ဖီ", unit: 1500 },
  { name: "နံနက်စာ အစုံ", unit: 5000 },
  { name: "ကိတ်မုန့်", unit: 2500 },
  { name: "ထမင်း တစ်ပန်းကန်", unit: 2000 },
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function slashDate(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function buildRows(): Row[] {
  const rows: Row[] = [];
  // Window: Apr 1 to May 27, 2026 — 57 days. Sample ~40 rows.
  const start = new Date(2026, 3, 1); // months are 0-indexed
  const end = new Date(2026, 4, 27);
  const day = 24 * 60 * 60 * 1000;

  let seed = 17;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let t = start.getTime(); t <= end.getTime(); t += day) {
    // 0–3 sales per day, biased toward 1–2.
    const sales = Math.floor(rand() * 4);
    for (let i = 0; i < sales; i++) {
      const cust = CUSTOMERS[Math.floor(rand() * CUSTOMERS.length)];
      const prod = PRODUCTS[Math.floor(rand() * PRODUCTS.length)];
      const qty = 1 + Math.floor(rand() * 3);
      const amount = prod.unit * qty;
      const d = new Date(t);
      // Half use ISO, half use slash — to test LLM date parsing resilience.
      const date = rand() < 0.5 ? isoDate(d) : slashDate(d);
      rows.push({
        date,
        customer: cust,
        product: prod.name,
        qty: rand() < 0.1 ? "" : qty, // ~10% blank quantity
        amount,
      });
    }
  }
  return rows;
}

function main() {
  const rows = buildRows();

  // Header row in Burmese-ish — typical of what a Myanmar shop owner might use.
  const headers = ["ရက်စွဲ", "ဖောက်သည် နာမည်", "ပစ္စည်း", "အရေအတွက်", "စျေး (ကျပ်)"];

  const aoa: (string | number)[][] = [headers];
  for (const r of rows) {
    aoa.push([r.date, r.customer, r.product, r.qty, r.amount]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sales");

  const out = join(process.cwd(), "sample-sales.xlsx");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  writeFileSync(out, buf);

  console.log(`✓ Wrote ${rows.length} rows to ${out}`);
  console.log(`  Date range : ${rows[0].date} → ${rows[rows.length - 1].date}`);
  console.log(`  Customers  : ${[...new Set(rows.map((r) => r.customer).filter(Boolean))].join(", ")}`);
  console.log(`  Products   : ${[...new Set(rows.map((r) => r.product))].join(", ")}`);
}

main();
