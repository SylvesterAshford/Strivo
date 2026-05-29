import { z } from "zod";
import * as XLSX from "xlsx";
import { getLLM } from "@/lib/llm";

export const ProductSeed = z.object({
  name: z.string().min(1).max(80),
  priceMmk: z.number().int().min(0).optional(),
});
export type ProductSeed = z.infer<typeof ProductSeed>;

const ExtractionResult = z.object({
  products: z.array(ProductSeed),
});

const SCHEMA_DESC = `{
  "products": [
    { "name": "<product name in original language>", "priceMmk": <number in MMK, optional> }
  ]
}`;

const PROMPT = `You are extracting a product or menu catalogue for a small business in Myanmar.

Identify every distinct product, menu item, or service in the text below.

Rules:
- One entry per distinct item; do not duplicate.
- "name" must be a short label, ≤80 chars, in the original language (Burmese or English).
- "priceMmk" is integer MMK if the text shows a price for the item. Omit otherwise.
- Skip headers, totals, customer names, dates, quantities, addresses, contact info.
- Up to 50 products.

Text:
`;

/** Run LLM extraction on a blob of free text. */
export async function extractProductsFromText(text: string): Promise<ProductSeed[]> {
  if (text.trim().length < 3) return [];
  const llm = getLLM();
  const prompt = `${PROMPT}${text.slice(0, 20_000)}`;
  const result = await llm.structured(prompt, {
    schema: ExtractionResult,
    schemaDescription: SCHEMA_DESC,
    retryOnInvalid: true,
    temperature: 0,
    maxTokens: 4096,
  });
  // Cap at 50 (LLM may return more); dedupe by normalised name.
  const seen = new Set<string>();
  const out: ProductSeed[] = [];
  for (const p of result.products) {
    const key = p.name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ name: p.name.trim(), ...(p.priceMmk !== undefined && { priceMmk: p.priceMmk }) });
    if (out.length >= 50) break;
  }
  return out;
}

/** Flatten an XLSX workbook to one cell-per-line text, for LLM extraction. */
export function xlsxToText(buffer: Buffer): string {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const lines: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: false,
      defval: null,
      raw: false,
    });
    for (const r of rows) {
      const line = r.map((c) => (c == null ? "" : String(c))).join(" | ");
      if (line.trim()) lines.push(line);
    }
  }
  return lines.join("\n");
}

/** Extract text from a digital PDF using pdf-parse. */
export async function pdfToText(buffer: Buffer): Promise<string> {
  const mod = await import("pdf-parse");
  const pdf = (mod as { default?: (b: Buffer) => Promise<{ text: string }>; }).default ?? (mod as unknown as (b: Buffer) => Promise<{ text: string }>);
  const result = await pdf(buffer);
  return result.text ?? "";
}
