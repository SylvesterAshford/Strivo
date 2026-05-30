import { NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth/mobile";
import { facts } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { triggerInsightsRegen } from "@/lib/insights/cache";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withMobileAuth(req, async (db, workspace) => {
    // Scope delete to the workspace so users can't delete other workspaces' facts.
    await db
      .delete(facts)
      .where(and(eq(facts.id, id), eq(facts.workspaceId, workspace.id)));

    triggerInsightsRegen(workspace.id);

    return NextResponse.json({ deleted: true });
  });
}
