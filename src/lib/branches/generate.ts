import { getLLM } from "@/lib/llm";
import { db } from "@/db/client";
import { entities, edges } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { createHash } from "node:crypto";
import { z } from "zod";
import { log } from "@/lib/log";

const BranchSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]{2,40}$/, "Branch name must be lowercase-hyphenated"),
  valence: z.enum(["favorable", "neutral", "contested", "adverse"]),
  probability: z.number().int().min(5).max(60),
  description: z.string().min(40).max(300),
  triggerEvent: z.string().min(20).max(200),
  involvedEntityIds: z.array(z.string()).min(1).max(15),
  commits: z.array(z.object({
    t: z.number().min(0.05).max(1),
    description: z.string().min(20).max(200),
    affectedEntityIds: z.array(z.string()).default([]),
    projectedEntities: z.array(z.object({
      name: z.string().min(1).max(80),
      kind: z.string().min(1).max(20),
    })).default([]),
  })).min(2).max(5),
});

const ResponseSchema = z.object({
  mainCommits: z.array(z.object({
    t: z.number().min(0).max(1),
    description: z.string().min(20).max(200),
    affectedEntityIds: z.array(z.string()).default([]),
  })).min(3).max(8),
  subBranches: z.array(BranchSchema).min(3).max(5),
});

interface GenerateContext {
  workspaceId: string;
  workspaceName: string;
  businessDescription: string | null;
}

async function buildContext(ctx: GenerateContext) {
  const allEntities = await db.query.entities.findMany({
    where: eq(entities.workspaceId, ctx.workspaceId),
    orderBy: [desc(entities.connectionCount)],
  });

  const userNode = allEntities.find((e) => e.kind === "you");
  const topConnected = allEntities
    .filter((e) => e.kind !== "you")
    .slice(0, 15);

  const focusEntities = userNode ? [userNode, ...topConnected] : topConnected;
  const focusEntityIds = new Set(focusEntities.map((e) => e.id));

  const allEdges = await db.query.edges.findMany({
    where: eq(edges.workspaceId, ctx.workspaceId),
  });
  const focusEdges = allEdges.filter(
    (e) => focusEntityIds.has(e.fromEntityId) && focusEntityIds.has(e.toEntityId),
  );

  return { focusEntities, focusEdges };
}

function buildPrompt(
  ctx: GenerateContext,
  focusEntities: (typeof entities.$inferSelect)[],
  focusEdges: (typeof edges.$inferSelect)[],
) {
  const entityList = focusEntities
    .map((e) => `  - ${e.id}: ${e.name} (${e.kind})${e.summary ? ` — ${e.summary}` : ""}`)
    .join("\n");

  const edgeList = focusEdges
    .map((e) => {
      const from = focusEntities.find((x) => x.id === e.fromEntityId)?.name;
      const to = focusEntities.find((x) => x.id === e.toEntityId)?.name;
      return `  - ${from} → ${to} (${e.kind})`;
    })
    .join("\n");

  return `You're a strategic-planning analyst building branching futures for the workspace "${ctx.workspaceName}"${ctx.businessDescription ? ` (${ctx.businessDescription})` : ""}.

Below is the current strategic graph. Generate possible futures as git-style branches.

## Current entities (top by connectivity)
${entityList || "  (No entities yet — the graph is too sparse for meaningful branch generation.)"}

## Current relationships
${edgeList || "  (No relationships yet.)"}

## Your task

Generate:

1. **mainCommits**: 3-8 events on the main timeline — what is most likely to happen if nothing changes. Each commit has:
   - t: a number 0..1 representing time horizon (0 = now, 1 = ~6 months out)
   - description: one-sentence event description (e.g., "Voicebox closes a $20M Series B")
   - affectedEntityIds: which entity IDs (from the list above) are involved

2. **subBranches**: 3-5 alternative futures. Each is a branch that diverges from main at some point. Each branch has:
   - name: short, lowercase-hyphenated identifier (e.g., "healthcare-wedge", "voicebox-eats-share")
   - valence: one of "favorable", "neutral", "contested", "adverse" (relative to the workspace owner's interests)
   - probability: integer 5-60 representing how likely this branch is
   - description: 2-3 sentences explaining what this branch represents
   - triggerEvent: what would have to happen for this branch to be chosen
   - involvedEntityIds: which entity IDs (from the list above) play meaningful roles
   - commits: 2-5 events along this branch, same shape as mainCommits, plus optional projectedEntities

## Diversity requirement

You MUST include AT LEAST ONE branch from each of these valences across your subBranches list:
- "favorable" (at least one)
- "adverse" (at least one)

If you only generate optimistic branches, you have failed the task. Real strategic planning means seeing both the wins and the threats.

## Output format

Output STRICT JSON in this exact shape. No preamble. No markdown fences. No explanatory text. Just the JSON object:

{
  "mainCommits": [
    { "t": 0.15, "description": "...", "affectedEntityIds": ["entity_id_1"] },
    ...
  ],
  "subBranches": [
    {
      "name": "lowercase-hyphenated-name",
      "valence": "favorable" | "neutral" | "contested" | "adverse",
      "probability": 5-60,
      "description": "...",
      "triggerEvent": "...",
      "involvedEntityIds": ["entity_id_1", "entity_id_2"],
      "commits": [
        { "t": 0.25, "description": "...", "affectedEntityIds": [...], "projectedEntities": [] },
        ...
      ]
    },
    ...
  ]
}

Sum of probabilities across subBranches should be between 60 and 95 (the rest represents "main as continued").`;
}

export async function generateBranches(ctx: GenerateContext) {
  const { focusEntities, focusEdges } = await buildContext(ctx);

  if (focusEntities.length < 3) {
    log({
      level: "info",
      message: "branches.skipped_sparse_graph",
      workspaceId: ctx.workspaceId,
      meta: { entityCount: focusEntities.length },
    });
    return { skipped: true as const, reason: "Graph too sparse for branch generation" };
  }

  const prompt = buildPrompt(ctx, focusEntities, focusEdges);

  // Use retryOnInvalid for the diversity check retry; the diversity constraint
  // is appended as corrective text on the second attempt via retryOnInvalid.
  // We run our own diversity check first so we can append the right message.
  let data: z.infer<typeof ResponseSchema>;
  try {
    data = await getLLM().structured(prompt, {
      schema: ResponseSchema,
      maxTokens: 4096,
      workKind: "reasoning",
      retryOnInvalid: true,
    });
  } catch (err: unknown) {
    throw new Error(`Branch generation failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!hasRequiredDiversity(data)) {
    log({ level: "warn", message: "branches.retry_diversity", workspaceId: ctx.workspaceId });
    try {
      data = await getLLM().structured(
        prompt + "\n\nYour previous response did not include both a favorable AND an adverse branch. Regenerate with both required valences present.",
        { schema: ResponseSchema, maxTokens: 4096, workKind: "reasoning", retryOnInvalid: false },
      );
    } catch (err: unknown) {
      throw new Error(`Branch generation failed after diversity retry: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { skipped: false as const, data, focusEntityIds: focusEntities.map((e) => e.id) };
}

function hasRequiredDiversity(data: z.infer<typeof ResponseSchema>) {
  const valences = new Set(data.subBranches.map((b) => b.valence));
  return valences.has("favorable") && valences.has("adverse");
}

export async function computeGraphStateHash(workspaceId: string): Promise<string> {
  const allEntities = await db.query.entities.findMany({
    where: eq(entities.workspaceId, workspaceId),
    orderBy: (e) => e.id,
  });
  const allEdges = await db.query.edges.findMany({
    where: eq(edges.workspaceId, workspaceId),
    orderBy: (e) => e.id,
  });

  const fingerprint = JSON.stringify({
    entities: allEntities.map((e) => ({ id: e.id, name: e.name, kind: e.kind, count: e.connectionCount })),
    edges: allEdges.map((e) => ({ id: e.id, from: e.fromEntityId, to: e.toEntityId, kind: e.kind })),
  });

  return createHash("sha256").update(fingerprint).digest("hex");
}

