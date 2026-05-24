"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { materials } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getMaterialContent(materialId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const material = await db.query.materials.findFirst({
    where: eq(materials.id, materialId),
    with: { workspace: true },
  });
  if (!material) throw new Error("Not found");
  if (material.workspace.ownerId !== userId) throw new Error("Forbidden");

  return {
    id: material.id,
    title: material.title,
    kind: material.kind,
    contentText: material.contentText,
    sourceUrl: material.sourceUrl,
    uploadedAt: material.uploadedAt,
    contextNote: material.contextNote,
  };
}
