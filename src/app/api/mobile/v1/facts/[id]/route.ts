import { NextResponse } from "next/server";
import { authenticateMobileRequest, getOrCreateMobileWorkspace } from "@/lib/auth/mobile";
import { db } from "@/db/client";
import { facts } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { triggerInsightsRegen } from "@/lib/insights/cache";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await authenticateMobileRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workspace = await getOrCreateMobileWorkspace(user);

  // Scope delete to the workspace so users can't delete other workspaces' facts.
  await db
    .delete(facts)
    .where(and(eq(facts.id, id), eq(facts.workspaceId, workspace.id)));

  triggerInsightsRegen(workspace.id);

  return NextResponse.json({ deleted: true });
}
