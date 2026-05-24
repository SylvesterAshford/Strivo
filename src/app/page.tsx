import { requireWorkspace } from "@/lib/workspace";
import { db } from "@/db/client";
import { entities, edges, materials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { HomeView } from "@/components/HomeView";
import { ColdStartView } from "@/components/ColdStartView";
import { loadDrillDown } from "@/app/actions/drilldown";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ node?: string }>;
}) {
  const params = await searchParams;
  const workspace = await requireWorkspace();

  const materialCount = await db.$count(materials, eq(materials.workspaceId, workspace.id));

  if (materialCount === 0) {
    return <ColdStartView />;
  }

  const allEntities = await db.query.entities.findMany({
    where: eq(entities.workspaceId, workspace.id),
  });

  const allEdges = await db.query.edges.findMany({
    where: eq(edges.workspaceId, workspace.id),
  });

  let initialDrillDown = null;
  if (params.node) {
    try {
      initialDrillDown = await loadDrillDown(params.node);
    } catch {
      // invalid node, render without drill-down
    }
  }

  return (
    <HomeView
      workspace={{ id: workspace.id, name: workspace.name }}
      nodes={allEntities.map((e) => ({
        id: e.id,
        name: e.name,
        kind: e.kind,
        summary: e.summary ?? null,
        positionX: e.positionX ?? null,
        positionY: e.positionY ?? null,
        connectionCount: e.connectionCount ?? 0,
        hidden: e.hidden ?? false,
      }))}
      edges={allEdges.map((e) => ({
        id: e.id,
        fromId: e.fromEntityId,
        toId: e.toEntityId,
        kind: e.kind as "quiet" | "active" | "strong" | "tension",
        weight: e.weight ?? 1,
      }))}
      initialDrillDown={initialDrillDown}
    />
  );
}
