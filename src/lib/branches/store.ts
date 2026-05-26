import { db } from "@/db/client";
import { branches, commits, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createId } from "@/lib/id";
import { generateBranches, computeGraphStateHash } from "./generate";
import { log } from "@/lib/log";

export async function regenerateBranches(workspaceId: string) {
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });
  if (!workspace) throw new Error("Workspace not found");

  const currentHash = await computeGraphStateHash(workspaceId);

  if (
    workspace.graphStateHash === currentHash &&
    workspace.branchesStatus === "complete"
  ) {
    log({
      level: "info",
      message: "branches.cache_hit",
      workspaceId,
    });
    return { cached: true };
  }

  await db.update(workspaces)
    .set({ branchesStatus: "generating", branchesError: null })
    .where(eq(workspaces.id, workspaceId));

  try {
    const result = await generateBranches({
      workspaceId,
      workspaceName: workspace.name,
      businessDescription: workspace.businessDescription,
    });

    if (result.skipped) {
      await db.delete(branches).where(eq(branches.workspaceId, workspaceId));
      await db.update(workspaces)
        .set({
          branchesStatus: "complete",
          branchesGeneratedAt: new Date(),
          graphStateHash: currentHash,
        })
        .where(eq(workspaces.id, workspaceId));
      return { cached: false, skipped: true, reason: result.reason };
    }

    await db.delete(branches).where(eq(branches.workspaceId, workspaceId));

    const mainBranchId = "main";
    await db.insert(branches).values({
      id: mainBranchId,
      workspaceId,
      name: "main",
      parentBranchId: null,
      valence: "main",
      probability: 100,
      description: "The most likely trajectory if no major decision is made.",
      triggerEvent: null,
      divergeAt: 0,
      divergeY: 0,
      origin: "system",
      simulationId: null,
      zepGroupId: workspaceId,
      involvedEntityIds: result.focusEntityIds,
    });

    for (let i = 0; i < result.data.mainCommits.length; i++) {
      const c = result.data.mainCommits[i];
      await db.insert(commits).values({
        id: `cm_${createId()}`,
        branchId: mainBranchId,
        t: c.t,
        kind: c.t === 0 ? "present" : "event",
        description: c.description,
        date: null,
        affectedEntityIds: c.affectedEntityIds,
        projectedEntities: [],
        projectedEdges: [],
        orderIndex: i,
      });
    }

    let divergeYCounter = 1;
    for (const sb of result.data.subBranches) {
      const branchId = `br_${createId()}`;
      const yOffset =
        sb.valence === "favorable" ? divergeYCounter * 35 :
        sb.valence === "adverse" ? -divergeYCounter * 35 :
        (divergeYCounter % 2 === 0 ? 18 : -18);

      await db.insert(branches).values({
        id: branchId,
        workspaceId,
        name: sb.name,
        parentBranchId: mainBranchId,
        valence: sb.valence,
        probability: sb.probability,
        description: sb.description,
        triggerEvent: sb.triggerEvent,
        divergeAt: sb.commits[0]?.t ?? 0.3,
        divergeY: yOffset,
        origin: "system",
        simulationId: null,
        zepGroupId: `${workspaceId}__branch_${branchId}`,
        involvedEntityIds: sb.involvedEntityIds,
      });

      for (let i = 0; i < sb.commits.length; i++) {
        const c = sb.commits[i];
        await db.insert(commits).values({
          id: `cm_${createId()}`,
          branchId,
          t: c.t,
          kind: i === sb.commits.length - 1 ? "terminus" : "event",
          description: c.description,
          date: null,
          affectedEntityIds: c.affectedEntityIds,
          projectedEntities: c.projectedEntities.map((pe) => ({
            name: pe.name,
            kind: pe.kind,
            id: `pe_${createId()}`,
          })),
          projectedEdges: [],
          orderIndex: i,
        });
      }

      divergeYCounter++;
    }

    await db.update(workspaces)
      .set({
        branchesStatus: "complete",
        branchesGeneratedAt: new Date(),
        graphStateHash: currentHash,
      })
      .where(eq(workspaces.id, workspaceId));

    log({
      level: "info",
      message: "branches.generated",
      workspaceId,
      meta: {
        subBranchCount: result.data.subBranches.length,
        mainCommitCount: result.data.mainCommits.length,
      },
    });

    return { cached: false, skipped: false };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log({
      level: "error",
      message: "branches.generation_failed",
      workspaceId,
      meta: { error: message },
    });
    await db.update(workspaces)
      .set({
        branchesStatus: "failed",
        branchesError: message,
      })
      .where(eq(workspaces.id, workspaceId));
    throw err;
  }
}
