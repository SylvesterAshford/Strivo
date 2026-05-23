import { db } from "@/db/client";
import { edges } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getEdgesByWorkspace(workspaceId: string) {
  return db.query.edges.findMany({
    where: eq(edges.workspaceId, workspaceId),
  });
}
