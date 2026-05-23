"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { entities, workspaces } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function pinEntity(entityId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const entity = await db.query.entities.findFirst({ where: eq(entities.id, entityId) });
  if (!entity) throw new Error("Entity not found");

  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, entity.workspaceId),
  });
  if (!ws || ws.ownerId !== userId) throw new Error("Forbidden");

  // Unpin any existing pinned entity in this workspace
  await db
    .update(entities)
    .set({ pinnedToCenter: false })
    .where(
      and(
        eq(entities.workspaceId, entity.workspaceId),
        eq(entities.pinnedToCenter, true),
      ),
    );

  await db
    .update(entities)
    .set({ pinnedToCenter: !entity.pinnedToCenter })
    .where(eq(entities.id, entityId));

  revalidatePath("/");
}

export async function hideEntity(entityId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const entity = await db.query.entities.findFirst({ where: eq(entities.id, entityId) });
  if (!entity) throw new Error("Entity not found");

  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, entity.workspaceId),
  });
  if (!ws || ws.ownerId !== userId) throw new Error("Forbidden");

  await db
    .update(entities)
    .set({ hidden: !entity.hidden })
    .where(eq(entities.id, entityId));

  revalidatePath("/");
}
