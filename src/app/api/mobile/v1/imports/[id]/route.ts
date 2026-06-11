import { NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth/mobile";
import { importBatches } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { triggerInsightsRegen } from "@/lib/insights/cache";

/**
 * Undo an import: deleting the batch CASCADE-deletes every fact it created,
 * so Home/Reports/Insights numbers roll back to before the upload.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withMobileAuth(req, async (db, workspace) => {
    const deleted = await db
      .delete(importBatches)
      .where(and(eq(importBatches.id, id), eq(importBatches.workspaceId, workspace.id)))
      .returning({ id: importBatches.id });

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    triggerInsightsRegen(workspace.id);
    return NextResponse.json({ deleted: true });
  });
}
