"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { materials, mentions, entities, edges } from "@/db/schema";
import { and, eq, inArray, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { del as deleteBlob } from "@vercel/blob";
import { deleteEpisodeIfPossible, refreshGroupGraph } from "@/lib/zep";
import { log } from "@/lib/log";

export async function deleteMaterial(materialId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const material = await db.query.materials.findFirst({
    where: eq(materials.id, materialId),
    with: { workspace: true },
  });
  if (!material) throw new Error("Material not found");
  if (material.workspace.ownerId !== userId) throw new Error("Forbidden");

  const materialMentions = await db.query.mentions.findMany({
    where: eq(mentions.materialId, materialId),
  });
  const entityIdsInThisMaterial = [...new Set(materialMentions.map((m) => m.entityId))];

  const orphanedEntityIds: string[] = [];
  for (const eid of entityIdsInThisMaterial) {
    const otherMentions = await db.query.mentions.findFirst({
      where: and(eq(mentions.entityId, eid), ne(mentions.materialId, materialId)),
    });
    if (!otherMentions) {
      orphanedEntityIds.push(eid);
    }
  }

  try {
    await deleteEpisodeIfPossible({ groupId: material.workspaceId, materialId });
  } catch (err) {
    log({ level: "warn", message: "zep.delete_episode_failed", meta: { materialId, error: String(err) } });
  }

  if (orphanedEntityIds.length > 0) {
    await db.delete(edges).where(
      and(
        eq(edges.workspaceId, material.workspaceId),
        or(
          inArray(edges.fromEntityId, orphanedEntityIds),
          inArray(edges.toEntityId, orphanedEntityIds),
        ),
      ),
    );
  }

  await db.delete(mentions).where(eq(mentions.materialId, materialId));

  if (orphanedEntityIds.length > 0) {
    await db.delete(entities).where(inArray(entities.id, orphanedEntityIds));
  }

  const survivingIds = entityIdsInThisMaterial.filter((id) => !orphanedEntityIds.includes(id));
  for (const eid of survivingIds) {
    const count = await db.$count(
      edges,
      and(
        eq(edges.workspaceId, material.workspaceId),
        or(eq(edges.fromEntityId, eid), eq(edges.toEntityId, eid)),
      ),
    );
    await db.update(entities).set({ connectionCount: count }).where(eq(entities.id, eid));
  }

  if (material.storagePath) {
    try {
      await deleteBlob(material.storagePath);
    } catch (err) {
      log({ level: "warn", message: "blob.delete_failed", meta: { materialId, path: material.storagePath } });
    }
  }

  await db.delete(materials).where(eq(materials.id, materialId));

  // Fire-and-forget: refresh Zep graph metadata after deletion. Non-critical.
  refreshGroupGraph(material.workspaceId).catch((err) => {
    log({ level: "warn", message: "zep.refresh_after_delete_failed", meta: { materialId, error: String(err) } });
  });

  log({
    level: "info",
    message: "material.deleted",
    workspaceId: material.workspaceId,
    userId,
    meta: { materialId, orphanedEntities: orphanedEntityIds.length },
  });

  revalidatePath("/");

  return { orphanedEntitiesRemoved: orphanedEntityIds.length };
}
