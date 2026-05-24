import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { z } from "zod";
import { createHash } from "node:crypto";

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const SummarySchema = z.object({
  summary: z.string(),
  strategicRead: z.string(),
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
${params.connectedEntities.map((c) => `- ${c.name} (${c.relationship})`).join("\n")}

Return ONLY a JSON object with two fields:
  "summary": A 2-3 sentence description of what this entity is and what it has done recently. Factual. No speculation.
  "strategicRead": A 4-6 sentence analytical paragraph from the founder's perspective. What does this entity's presence and activity mean for the founder's business? What should they watch? Be direct, not hedging.

No markdown. No code fences. Pure JSON.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text in LLM response");
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON object found in response");

  const parsed = SummarySchema.parse(JSON.parse(jsonMatch[0]));

  return { ...parsed, inputHash };
}
