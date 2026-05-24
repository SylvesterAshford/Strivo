"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { materials } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireWorkspace } from "@/lib/workspace";

export async function listMaterials() {
  const { userId } = await auth();
  if (!userId) return [];

  const ws = await requireWorkspace();

  const rows = await db.query.materials.findMany({
    where: eq(materials.workspaceId, ws.id),
    orderBy: [desc(materials.uploadedAt)],
  });

  return rows.map((m) => ({
    id: m.id,
    title: m.title,
    kind: m.kind,
    uploadedAt: m.uploadedAt,
    processingStatus: m.processingStatus,
    entitiesAdded: m.entitiesAdded ?? 0,
  }));
}
