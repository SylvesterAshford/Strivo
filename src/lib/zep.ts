import { ZepClient } from "@getzep/zep-cloud";
import { env } from "@/lib/env";
import { log } from "@/lib/log";

const zep = new ZepClient({ apiKey: env.ZEP_API_KEY });

// Graph ID convention: workspace_id is used as the Zep graph_id.
// Branch contexts (phase 4) use `${workspaceId}__branch_${branchId}`.

export async function ensureGroup(graphId: string, description: string) {
  try {
    await zep.graph.create({ graphId, description });
  } catch (err: unknown) {
    // If graph already exists, that's fine.
    const msg = err instanceof Error ? err.message : String(err);
    if (!/already exists|conflict|409/i.test(msg)) {
      throw err;
    }
  }
}

export async function ingestText(params: {
  groupId: string;
  text: string;
  source: string;
}): Promise<{ messageId: string }> {
  const episode = await zep.graph.add({
    data: params.text,
    type: "text",
    graphId: params.groupId,
    sourceDescription: params.source,
  });
  log({ level: "debug", message: "zep.ingestText result", meta: { uuid: episode.uuid } });
  return { messageId: episode.uuid };
}

export async function getEntities(groupId: string) {
  const nodes = await zep.graph.node.getByGraphId(groupId, {});
  return nodes.map((n) => ({
    id: n.uuid,
    name: n.name,
    summary: n.summary ?? null,
    kind: inferKind(n.labels ?? []),
    createdAt: n.createdAt,
  }));
}

export async function getEdges(groupId: string) {
  const edgeList = await zep.graph.edge.getByGraphId(groupId, {});
  return edgeList.map((e) => ({
    id: e.uuid,
    fromId: e.sourceNodeUuid,
    toId: e.targetNodeUuid,
    name: e.name,
    fact: e.fact,
    validFrom: e.validAt ?? e.createdAt,
    validUntil: e.invalidAt ?? null,
  }));
}

function inferKind(labels: string[]): string {
  const lower = labels.map((l) => l.toLowerCase());
  if (lower.some((l) => l.includes("person") || l.includes("human"))) return "person";
  if (lower.some((l) => l.includes("company") || l.includes("corp"))) return "company";
  if (lower.some((l) => l.includes("organization") || l.includes("agency"))) return "organization";
  if (lower.some((l) => l.includes("product") || l.includes("service"))) return "product";
  if (lower.some((l) => l.includes("event"))) return "event";
  if (lower.some((l) => l.includes("policy") || l.includes("regulation"))) return "policy";
  if (lower.some((l) => l.includes("location") || l.includes("place"))) return "place";
  if (lower.some((l) => l.includes("concept") || l.includes("topic"))) return "concept";
  return "default";
}

export async function waitForExtraction(params: {
  groupId: string;
  messageId: string;
  timeoutMs?: number;
}): Promise<boolean> {
  const timeout = params.timeoutMs ?? 60_000;
  await new Promise((r) => setTimeout(r, Math.min(timeout, 3000)));
  return true;
}
