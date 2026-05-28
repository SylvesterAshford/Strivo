import * as XLSX from "xlsx";
import { z } from "zod";
import { getLLM } from "@/lib/llm";

// Row as raw cells. Header cells go in headers[]; data rows in rows[].
export interface ParsedSheet {
  headers: string[];
  rows: (string | number | null)[][];
}

/** Parse the first non-empty sheet of an XLSX/XLS file into headers + rows. */
export function parseWorkbook(buffer: Buffer): ParsedSheet {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("Workbook has no sheets");

  const sheet = wb.Sheets[sheetName];
  // header:1 → array of arrays (preserves column order even when columns are sparse)
  const raw = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: null,
    raw: false,
  });

  if (raw.length === 0) return { headers: [], rows: [] };

  const [headerRow, ...dataRows] = raw;
  const headers = headerRow.map((h) => (h == null ? "" : String(h).trim()));
  const rows = dataRows.map((r) =>
    r.map((c) => {
      if (c == null) return null;
      if (c instanceof Date) return c.toISOString();
      return c as string | number;
    })
  );

  return { headers, rows };
}

// ── Column mapping via LLM ──────────────────────────────────────────────────

export type ColumnRole = "date" | "customer" | "amount" | "product" | "quantity" | "ignore";

export const ColumnMapping = z.object({
  // Index in headers[] for each role. -1 means "not detected".
  date: z.number().int(),
  customer: z.number().int(),
  amount: z.number().int(),
  product: z.number().int(),
  quantity: z.number().int(),
});
export type ColumnMapping = z.infer<typeof ColumnMapping>;

const MAPPING_SCHEMA_DESC = `{
  "date": <column index where dates appear (integer), -1 if not present>,
  "customer": <column index for customer / counterparty names, -1 if absent>,
  "amount": <column index containing sale amount in MMK (integer), -1 if absent>,
  "product": <column index naming the product / item sold, -1 if absent>,
  "quantity": <column index with quantity sold, -1 if absent>
}`;

const PROMPT = `You are analyzing a Myanmar small-business sales ledger exported from Excel.
Given the column headers and the first sample rows, identify which column index
holds each role. Columns may have Burmese or English headers. Headers can be
absent or misleading — use the sample values to decide. Indices are 0-based.
If a role is missing, return -1.

Roles:
- date: when the sale happened (any date format).
- customer: name of the buyer / counterparty.
- amount: total sale value in MMK (integer kyats).
- product: what was sold.
- quantity: how many units.

Headers:
%HEADERS%

Sample rows (first 8 only):
%SAMPLE%
`;

/** Ask the LLM to identify column roles. Returns the mapping. */
export async function detectColumnMapping(sheet: ParsedSheet): Promise<ColumnMapping> {
  const sample = sheet.rows
    .slice(0, 8)
    .map((r, i) => `${i + 1}: ${r.map((c) => (c == null ? "" : String(c))).join(" | ")}`)
    .join("\n");
  const headers = sheet.headers
    .map((h, i) => `[${i}] ${h || "(blank)"}`)
    .join("\n");

  const prompt = PROMPT.replace("%HEADERS%", headers).replace("%SAMPLE%", sample);
  return getLLM().structured(prompt, {
    schema: ColumnMapping,
    schemaDescription: MAPPING_SCHEMA_DESC,
    retryOnInvalid: true,
    temperature: 0,
    maxTokens: 256,
  });
}

// ── Row → fact mapping ──────────────────────────────────────────────────────

export interface DraftFactRow {
  description: string;
  amountMmk: number | null;
  counterparty: string | null;
  occurredAt: Date;
}

const BURMESE_DIGITS: Record<string, string> = {
  "၀": "0", "၁": "1", "၂": "2", "၃": "3", "၄": "4",
  "၅": "5", "၆": "6", "၇": "7", "၈": "8", "၉": "9",
};
function toAsciiDigits(s: string): string {
  return s.replace(/[၀-၉]/g, (d) => BURMESE_DIGITS[d] ?? d);
}

function parseAmount(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return Math.round(raw);
  const cleaned = toAsciiDigits(String(raw)).replace(/[^0-9.-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function parseDate(raw: unknown): Date | null {
  if (raw == null) return null;
  if (raw instanceof Date) return raw;
  const s = toAsciiDigits(String(raw)).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function cellText(raw: unknown): string {
  if (raw == null) return "";
  return String(raw).trim();
}

/**
 * Apply a column mapping to parsed rows. Each row becomes a draft fact.
 * Rows without a usable amount AND without a date are dropped.
 */
export function rowsToFacts(sheet: ParsedSheet, mapping: ColumnMapping): DraftFactRow[] {
  const facts: DraftFactRow[] = [];
  for (const r of sheet.rows) {
    const amount = mapping.amount >= 0 ? parseAmount(r[mapping.amount]) : null;
    const date = mapping.date >= 0 ? parseDate(r[mapping.date]) : null;
    if (amount === null && !date) continue;

    const customer = mapping.customer >= 0 ? cellText(r[mapping.customer]) : "";
    const product = mapping.product >= 0 ? cellText(r[mapping.product]) : "";
    const quantity = mapping.quantity >= 0 ? cellText(r[mapping.quantity]) : "";

    const parts = [product, quantity].filter(Boolean);
    const description = parts.length > 0 ? parts.join(" × ") : "Excel import";

    facts.push({
      description: description.slice(0, 200),
      amountMmk: amount,
      counterparty: customer || null,
      occurredAt: date ?? new Date(),
    });
  }
  return facts;
}
