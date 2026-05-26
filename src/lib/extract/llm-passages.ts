import { z } from "zod";
import { getLLM } from "@/lib/llm";

const PassageSchema = z.object({
  entityName: z.string(),
  passage: z.string(),
  start: z.number(),
  end: z.number(),
});

const PassageListSchema = z.array(PassageSchema);

export async function extractPassages(params: {
  text: string;
  entities: Array<{ id: string; name: string }>;
}): Promise<Array<{ entityId: string; passage: string; start: number; end: number }>> {
  if (params.entities.length === 0) return [];

  const entityList = params.entities.map((e) => `- ${e.name}`).join("\n");

  const prompt = `You are extracting mention spans from a document.

For each entity below, find the single most representative passage in the document that mentions it.

Entities to find:
${entityList}

Document:
"""
${params.text}
"""

For each entity that is genuinely mentioned in the document, return an object with:
  "entityName": the exact entity name as listed above
  "passage": the sentence (or two adjacent sentences) that mentions it, copied verbatim from the document
  "start": the character offset where the passage begins in the document
  "end": the character offset where the passage ends

If an entity is not mentioned in the document, skip it. Do not invent passages.`;

  let result: z.infer<typeof PassageListSchema>;
  try {
    result = await getLLM().structured(prompt, {
      schema: PassageListSchema,
      maxTokens: 4096,
      workKind: "fast",
      retryOnInvalid: false,
    });
  } catch {
    return [];
  }

  const nameToId = new Map(params.entities.map((e) => [e.name.toLowerCase(), e.id]));
  return result
    .map((p) => {
      const id = nameToId.get(p.entityName.toLowerCase());
      if (!id) return null;
      return { entityId: id, passage: p.passage, start: p.start, end: p.end };
    })
    .filter((p): p is { entityId: string; passage: string; start: number; end: number } => p !== null);
}
