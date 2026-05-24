import { db } from "@/db/client";
import { entities, edges } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getEntities, getEdges } from "@/lib/zep";

async function main() {
  const ws = await db.query.workspaces.findFirst();
  if (!ws) { console.log("No workspace"); process.exit(1); }

  console.log(`Syncing workspace: ${ws.id}`);

  const zepEntities = await getEntities(ws.id);
  const zepEdges = await getEdges(ws.id);
  const nodeSet = new Set(zepEntities.map(n => n.id));

  // Alias for the rest of the script
  const nodes = zepEntities.map(n => ({ uuid: n.id, name: n.name, summary: n.summary, kind: n.kind }));
  const edgeList = zepEdges.map(e => ({ uuid: e.id, sourceNodeUuid: e.fromId, targetNodeUuid: e.toId, validAt: e.validFrom, invalidAt: e.validUntil, createdAt: e.validFrom }));

  console.log(`Zep: ${nodes.length} nodes, ${edgeList.length} edges`);

  const existing = await db.query.entities.findMany({ where: eq(entities.workspaceId, ws.id) });
  const existingIds = new Set(existing.map(e => e.id));

  let added = 0, updated = 0;
  for (const n of nodes) {
    if (existingIds.has(n.uuid)) {
      await db.update(entities).set({ name: n.name, kind: n.kind, summary: n.summary ?? null }).where(eq(entities.id, n.uuid));
      updated++;
    } else {
      await db.insert(entities).values({
        id: n.uuid,
        workspaceId: ws.id,
        name: n.name,
        kind: n.kind,
        summary: n.summary ?? null,
        zepEntityId: n.uuid,
        connectionCount: 0,
      });
      added++;
    }
  }

  const existingEdges = await db.query.edges.findMany({ where: eq(edges.workspaceId, ws.id) });
  const existingEdgeIds = new Set(existingEdges.map(e => e.id));
  let edgesAdded = 0;
  for (const e of edgeList) {
    if (existingEdgeIds.has(e.uuid)) continue;
    if (!nodeSet.has(e.sourceNodeUuid) || !nodeSet.has(e.targetNodeUuid)) continue;
    await db.insert(edges).values({
      id: e.uuid,
      workspaceId: ws.id,
      fromEntityId: e.sourceNodeUuid,
      toEntityId: e.targetNodeUuid,
      kind: "active",
      weight: 1,
      validFrom: new Date(e.validAt ?? e.createdAt),
      validUntil: e.invalidAt ? new Date(e.invalidAt) : null,
      zepEdgeId: e.uuid,
    });
    edgesAdded++;
  }

  // Update connection counts
  for (const n of nodes) {
    const count = edgeList.filter(e => e.sourceNodeUuid === n.uuid || e.targetNodeUuid === n.uuid).length;
    await db.update(entities).set({ connectionCount: count }).where(eq(entities.id, n.uuid));
  }

  console.log(`Done: +${added} entities, ~${updated} updated, +${edgesAdded} edges`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
