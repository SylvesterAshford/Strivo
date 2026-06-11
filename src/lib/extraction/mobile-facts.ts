import { z } from "zod";
import { getLLM } from "@/lib/llm";

// Fact kinds the extractor can produce (free-text + spreadsheet import).
export const factKinds = ["sale", "expense", "receivable", "note"] as const;
export type FactKind = (typeof factKinds)[number];

export const DraftFact = z.object({
  kind: z.enum(factKinds),
  amountMmk: z.number().int().min(0).optional(),
  description: z.string().min(1),
  counterparty: z.string().optional(),
  // Expense category (e.g. rent, wages, utilities). Optional and only
  // meaningful for kind="expense".
  category: z.string().max(40).optional(),
  // Structured product enrichment — only meaningful for kind="sale", and only
  // when the text actually names a product. Powers "what sells best?".
  productName: z.string().max(80).optional(),
  quantity: z.number().int().min(1).max(100_000).optional(),
});

export type DraftFact = z.infer<typeof DraftFact>;

const ExtractionResult = z.object({
  facts: z.array(DraftFact),
});

const SCHEMA_DESC = `{
  "facts": [
    {
      "kind": "sale" | "expense" | "receivable" | "note",
      "amountMmk": number (integer, MMK, optional),
      "description": "short description in Burmese or English",
      "counterparty": "customer / supplier name if mentioned (optional)",
      "category": "expense category (rent, wages, supplies, etc) — only set when kind='expense' (optional)",
      "productName": "name of the product/item sold — only when kind='sale' and a product is named (optional)",
      "quantity": number (integer units sold — only when kind='sale' and a count is stated, optional)
    }
  ]
}`;

const PROMPT_PREFIX = `You are an assistant for a Myanmar small business owner.
Extract structured business facts from this Burmese business text.

Rules:
- "sale"       = revenue received (ရောင်းရငွေ, ဝင်ငွေ)
- "expense"    = money spent (ကုန်ကျစရိတ်, ငွေပေးချေ)
- "receivable" = money owed TO the owner (လက်ကျန်ငွေ, နောက်မှပေးမည်)
- "note"       = any other useful business observation
- amountMmk: integer kyats only; omit if no amount stated
- description: keep it short (≤ 60 chars), in the language used by the speaker
- counterparty: name of customer or supplier if mentioned; omit otherwise
- category: only for kind="expense" — short word/phrase for the expense bucket (ဆိုင်ခ, လုပ်ခ, ပစ္စည်းသွင်း, မီးခ, ရေခ, သယ်ယူခ etc). Omit for non-expense kinds.
- productName: only for kind="sale" when a product/item is named (e.g. "လက်ဖက်ရည် ၃ ခွက်" → productName "လက်ဖက်ရည်"). Omit otherwise.
- quantity: only for kind="sale" when a unit count is stated (e.g. "၃ ခွက်" → 3). Omit otherwise.
- Extract ALL facts; one fact per financial event

Transcript:
`;

export async function extractFacts(transcript: string): Promise<DraftFact[]> {
  const llm = getLLM();
  const prompt = `${PROMPT_PREFIX}${transcript}`;
  const result = await llm.structured(prompt, {
    schema: ExtractionResult,
    schemaDescription: SCHEMA_DESC,
    retryOnInvalid: true,
    temperature: 0,
    // Burmese descriptions are ~5× the token count of English. Pasted ledgers
    // can run 50+ rows; 8192 covers ~60 facts before truncation (the lenient
    // JSON parser recovers a partial array if it still overruns).
    maxTokens: 8192,
  });
  return result.facts;
}
