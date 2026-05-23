import { db } from "@/db/client";
import { materials } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getMaterialsByWorkspace(workspaceId: string) {
  return db.query.materials.findMany({
    where: eq(materials.workspaceId, workspaceId),
    orderBy: (m, { desc }) => [desc(m.uploadedAt)],
  });
}

export async function getMaterialCount(workspaceId: string) {
  return db.$count(materials, eq(materials.workspaceId, workspaceId));
}
