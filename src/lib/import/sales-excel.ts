import * as XLSX from "xlsx";
import { z } from "zod";
import { getLLM } from "@/lib/llm";
import { cellText, parseAmountStrict, parseDateStrict, type FlaggedRow } from "./validate";

export type { FlaggedRow };

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
  // Structured product enrichment — the mapping already detects these columns;
  // storing them (not just concatenating into description) is what makes
  // "what sells best?" answerable. Null when the sheet has no such column.
  productName: string | null;
  quantity: number | null;
  unitPriceMmk: number | null;
}

export interface MappedRows {
  facts: DraftFactRow[];
  /** Rows excluded for data quality — shown to the user, never inserted. */
  flagged: FlaggedRow[];
}

/**
 * Apply a column mapping to parsed rows. Each usable row becomes a draft fact;
 * rows that fail strict validation are FLAGGED, never defaulted — a lenient
 * date fallback once landed a sale dated 2000-12-31 in prod.
 *
 * Rules (mirrored in expense-excel):
 * - both date and amount cells blank → silent skip (separator/blank line)
 * - date column mapped but cell blank/unparseable/outside window → bad_date
 * - amount column mapped: unparseable / ≤0 / >MAX_PLAUSIBLE_MMK → bad_amount,
 *   blank → missing_amount
 * - a column not detected at all (-1) imposes no rule, preserving the
 *   manual-mapping fallback (amount null / occurredAt = import time)
 */
export function rowsToFacts(sheet: ParsedSheet, mapping: ColumnMapping): MappedRows {
  const facts: DraftFactRow[] = [];
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

    const customer = mapping.customer >= 0 ? cellText(r[mapping.customer]) : "";
    const product = mapping.product >= 0 ? cellText(r[mapping.product]) : "";
    const quantityText = mapping.quantity >= 0 ? cellText(r[mapping.quantity]) : "";
    // Quantity is a count, not money: strict positive integer or null.
    const qtyParsed = quantityText ? parseAmountStrict(quantityText) : null;
    const quantity = qtyParsed !== null && qtyParsed > 0 && qtyParsed <= 100_000 ? qtyParsed : null;
    const unitPrice = amount !== null && quantity ? Math.round(amount / quantity) : null;

    const parts = [product, quantityText].filter(Boolean);
    const description = parts.length > 0 ? parts.join(" × ") : "Excel import";

    facts.push({
      description: description.slice(0, 200),
      amountMmk: amount,
      counterparty: customer || null,
      occurredAt: date ?? new Date(),
      productName: product ? product.slice(0, 80) : null,
      quantity,
      unitPriceMmk: unitPrice,
    });
  }
  return { facts, flagged };
}
