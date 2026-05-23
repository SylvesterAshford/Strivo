import { db } from "@/db/client";
import { entities } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getEntitiesByWorkspace(workspaceId: string) {
  return db.query.entities.findMany({
    where: eq(entities.workspaceId, workspaceId),
  });
}
