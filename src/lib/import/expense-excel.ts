import { z } from "zod";
import { getLLM } from "@/lib/llm";
import { parseWorkbook, type ParsedSheet } from "@/lib/import/sales-excel";
import { cellText, parseAmountStrict, parseDateStrict, type FlaggedRow } from "./validate";

export { parseWorkbook, type ParsedSheet };

// Column roles for an expense ledger. `category` (e.g. rent, wages, inventory)
// is the dimension that drives the Reports expense breakdown.
export const ExpenseColumnMapping = z.object({
  date: z.number().int(),
  amount: z.number().int(),
  category: z.number().int(),
  description: z.number().int(),
  counterparty: z.number().int(),
});
export type ExpenseColumnMapping = z.infer<typeof ExpenseColumnMapping>;

const MAPPING_SCHEMA_DESC = `{
  "date": <column index where dates appear (integer), -1 if not present>,
  "amount": <column index containing expense amount in MMK (integer), -1 if absent>,
  "category": <column index naming the expense category (e.g. rent, wages, supplies), -1 if absent>,
  "description": <column index with a free-text note for the expense, -1 if absent>,
  "counterparty": <column index for the supplier / payee / vendor name, -1 if absent>
}`;

const PROMPT = `You are analyzing a Myanmar small-business expense ledger exported from Excel.
Given the column headers and the first sample rows, identify which column index
holds each role. Columns may have Burmese or English headers. Headers can be
absent or misleading — use the sample values to decide. Indices are 0-based.
If a role is missing, return -1.

Roles:
- date: when the expense happened.
- amount: total expense value in MMK (integer kyats).
- category: rent / wages / inventory / utilities / transport / etc.
- description: free-text note explaining the expense.
- counterparty: supplier / payee / vendor name.

Headers:
%HEADERS%

Sample rows (first 8 only):
%SAMPLE%
`;

export async function detectExpenseColumnMapping(sheet: ParsedSheet): Promise<ExpenseColumnMapping> {
  const sample = sheet.rows
    .slice(0, 8)
    .map((r, i) => `${i + 1}: ${r.map((c) => (c == null ? "" : String(c))).join(" | ")}`)
    .join("\n");
  const headers = sheet.headers
    .map((h, i) => `[${i}] ${h || "(blank)"}`)
    .join("\n");

  const prompt = PROMPT.replace("%HEADERS%", headers).replace("%SAMPLE%", sample);
  return getLLM().structured(prompt, {
    schema: ExpenseColumnMapping,
    schemaDescription: MAPPING_SCHEMA_DESC,
    retryOnInvalid: true,
    temperature: 0,
    maxTokens: 256,
  });
}

// ── Row → fact mapping ──────────────────────────────────────────────────────

export interface ExpenseDraftRow {
  description: string;
  amountMmk: number | null;
  counterparty: string | null;
  category: string | null;
  occurredAt: Date;
}

export interface MappedExpenseRows {
  facts: ExpenseDraftRow[];
  /** Rows excluded for data quality — shown to the user, never inserted. */
  flagged: FlaggedRow[];
}

/** Same flag-don't-default rules as rowsToFacts in sales-excel.ts. */
export function rowsToExpenseFacts(
  sheet: ParsedSheet,
  mapping: ExpenseColumnMapping
): MappedExpenseRows {
  const out: ExpenseDraftRow[] = [];
  const flagged: FlaggedRow[] = [];
  for (let i = 0; i < sheet.rows.length; i++) {
    const r = sheet.rows[i];
    const rawAmount = mapping.amount >= 0 ? cellText(r[mapping.amount]) : "";
    const rawDate = mapping.date >= 0 ? cellText(r[mapping.date]) : "";
    if (rawAmount === "" && rawDate === "") continue;

    const date = mapping.date >= 0 ? parseDateStrict(r[mapping.date]) : null;
    if (mapping.date >= 0 && date === null) {
      flagged.push({ rowIndex: i, reason: "bad_date", rawValue: rawDate });
      continue;
    }

    let amount: number | null = null;
    if (mapping.amount >= 0) {
      if (rawAmount === "") {
        flagged.push({ rowIndex: i, reason: "missing_amount", rawValue: "" });
        continue;
      }
      amount = parseAmountStrict(r[mapping.amount]);
      if (amount === null) {
        flagged.push({ rowIndex: i, reason: "bad_amount", rawValue: rawAmount });
        continue;
      }
    }

    const category = mapping.category >= 0 ? cellText(r[mapping.category]) : "";
    const description = mapping.description >= 0 ? cellText(r[mapping.description]) : "";
    const counterparty = mapping.counterparty >= 0 ? cellText(r[mapping.counterparty]) : "";

    const desc = description || category || "Expense";
    out.push({
      description: desc.slice(0, 200),
      amountMmk: amount,
      counterparty: counterparty || null,
      category: category ? category.slice(0, 40) : null,
      occurredAt: date ?? new Date(),
    });
  }
  return { facts: out, flagged };
}
