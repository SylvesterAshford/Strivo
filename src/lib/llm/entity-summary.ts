import { z } from "zod";
import { createHash } from "node:crypto";
import { getLLM } from "@/lib/llm";

const SummarySchema = z.object({
  summary: z.string().min(20).max(400),
  strategicRead: z.string().min(50).max(800),
});

export async function generateEntitySummary(params: {
  entityName: string;
  entityKind: string;
  workspaceName: string;
  workspaceDescription: string | null;
  mentions: Array<{ materialTitle: string; passage: string }>;
  connectedEntities: Array<{ name: string; relationship: string }>;
}): Promise<{ summary: string; strategicRead: string; inputHash: string }> {
  const input = {
    entity: { name: params.entityName, kind: params.entityKind },
    workspace: { name: params.workspaceName, description: params.workspaceDescription },
    mentions: params.mentions,
    connections: params.connectedEntities,
  };
  const inputHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");

  const prompt = `You are summarizing an entity in a strategic intelligence graph for a founder.

The user's business is: ${params.workspaceName}
${params.workspaceDescription ? `Description: ${params.workspaceDescription}` : ""}

The entity to summarize is: "${params.entityName}" (kind: ${params.entityKind})

Materials that mention this entity:
${params.mentions.map((m) => `From "${m.materialTitle}": ${m.passage}`).join("\n\n")}

Entities connected to this one:
${params.connectedEntities.map((c) => `- ${c.name} (${c.relationship})`).join("\n")}`;

  const result = await getLLM().structured(prompt, {
    schema: SummarySchema,
    schemaDescription: `{
  "summary": "2-3 sentence factual description of what this entity is and what it has done recently",
  "strategicRead": "4-6 sentence analytical paragraph from the founder's perspective — what does this entity mean for the business, what should they watch"
}`,
    maxTokens: 800,
    workKind: "reasoning",
    retryOnInvalid: true,
  });

  return { summary: result.summary, strategicRead: result.strategicRead, inputHash };
}
