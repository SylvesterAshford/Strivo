import { z } from "zod";
import { getLLM } from "@/lib/llm";

// Fact kinds the mobile voice pipeline can extract.
export const factKinds = ["sale", "expense", "receivable", "note"] as const;
export type FactKind = (typeof factKinds)[number];

export const DraftFact = z.object({
  kind: z.enum(factKinds),
  amountMmk: z.number().int().min(0).optional(),
  description: z.string().min(1),
  counterparty: z.string().optional(),
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
      "counterparty": "customer / supplier name if mentioned (optional)"
    }
  ]
}`;

const PROMPT_PREFIX = `You are an assistant for a Myanmar small business owner.
Extract structured business facts from this Burmese voice memo transcript.

Rules:
- "sale"       = revenue received (ရောင်းရငွေ, ဝင်ငွေ)
- "expense"    = money spent (ကုန်ကျစရိတ်, ငွေပေးချေ)
- "receivable" = money owed TO the owner (လက်ကျန်ငွေ, နောက်မှပေးမည်)
- "note"       = any other useful business observation
- amountMmk: integer kyats only; omit if no amount stated
- description: keep it short (≤ 60 chars), in the language used by the speaker
- counterparty: name of customer or supplier if mentioned; omit otherwise
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
    // Burmese descriptions are ~5× the token count of English. 4096 covers
    // ~30 facts comfortably; pasted ledgers can exceed the 1K we started with.
    maxTokens: 4096,
  });
  return result.facts;
}
