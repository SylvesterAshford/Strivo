import { requireWorkspace } from "@/lib/workspace";
import { db } from "@/db/client";
import { entities, edges, materials, branches } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { HomeView } from "@/components/HomeView";
import { ColdStartView } from "@/components/ColdStartView";
import { loadDrillDown } from "@/app/actions/drilldown";
import type { BranchData } from "@/types/branches";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ node?: string; branch?: string; t?: string }>;
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

  const allBranches = await db.query.branches.findMany({
    where: eq(branches.workspaceId, workspace.id),
    with: {
      commits: {
        orderBy: (c, { asc }) => asc(c.orderIndex),
      },
    },
    orderBy: (b, { asc }) => asc(b.divergeY),
  });

  const branchName = params.branch ?? null;
  const isHypothetical = !!(branchName && branchName !== "main");

  let activeBranch: BranchData | null = null;
  if (isHypothetical) {
    const found = await db.query.branches.findFirst({
      where: and(
        eq(branches.workspaceId, workspace.id),
        eq(branches.name, branchName!),
      ),
      with: {
        commits: { orderBy: (c, { asc }) => asc(c.orderIndex) },
      },
    });
    if (found) {
      activeBranch = {
        id: found.id,
        workspaceId: found.workspaceId,
        name: found.name,
        parentBranchId: found.parentBranchId,
        valence: found.valence as BranchData["valence"],
        probability: found.probability,
        description: found.description,
        triggerEvent: found.triggerEvent,
        divergeAt: found.divergeAt,
        divergeY: found.divergeY ?? 0,
        origin: found.origin as BranchData["origin"],
        involvedEntityIds: (found.involvedEntityIds ?? []) as string[],
        commits: (found.commits ?? []).map((c) => ({
          id: c.id,
          branchId: c.branchId,
          t: c.t,
          kind: c.kind as "present" | "event" | "decision" | "terminus",
          description: c.description,
          affectedEntityIds: (c.affectedEntityIds ?? []) as string[],
          projectedEntities: (c.projectedEntities ?? []) as Array<{ name: string; kind: string; id: string }>,
          projectedEdges: (c.projectedEdges ?? []) as Array<{ from: string; to: string; kind: string }>,
          orderIndex: c.orderIndex,
        })),
      };
    }
  }

  return (
    <HomeView
      workspace={{ id: workspace.id, name: workspace.name, createdAt: workspace.createdAt }}
      nodes={allEntities.map((e) => ({
        id: e.id,
        name: e.name,
        kind: e.kind,
        summary: e.summary ?? null,
        positionX: e.positionX ?? null,
        positionY: e.positionY ?? null,
        connectionCount: e.connectionCount ?? 0,
        hidden: e.hidden ?? false,
        firstSeenAt: e.firstSeenAt,
      }))}
      edges={allEdges.map((e) => ({
        id: e.id,
        fromId: e.fromEntityId,
        toId: e.toEntityId,
        kind: e.kind as "quiet" | "active" | "strong" | "tension",
        weight: e.weight ?? 1,
        validFrom: e.validFrom,
      }))}
      initialDrillDown={initialDrillDown}
      initialBranches={allBranches.map((b) => ({
        id: b.id,
        workspaceId: b.workspaceId,
        name: b.name,
        parentBranchId: b.parentBranchId,
        valence: b.valence as BranchData["valence"],
        probability: b.probability,
        description: b.description,
        triggerEvent: b.triggerEvent,
        divergeAt: b.divergeAt,
        divergeY: b.divergeY ?? 0,
        origin: b.origin as BranchData["origin"],
        involvedEntityIds: (b.involvedEntityIds ?? []) as string[],
        commits: (b.commits ?? []).map((c) => ({
          id: c.id,
          branchId: c.branchId,
          t: c.t,
          kind: c.kind as "present" | "event" | "decision" | "terminus",
          description: c.description,
          affectedEntityIds: (c.affectedEntityIds ?? []) as string[],
          projectedEntities: (c.projectedEntities ?? []) as Array<{ name: string; kind: string; id: string }>,
          projectedEdges: (c.projectedEdges ?? []) as Array<{ from: string; to: string; kind: string }>,
          orderIndex: c.orderIndex,
        })),
      }))}
      initialBranchStatus={(workspace.branchesStatus ?? "idle") as "idle" | "generating" | "complete" | "failed"}
      activeBranch={activeBranch}
      isHypothetical={isHypothetical}
    />
  );
}
