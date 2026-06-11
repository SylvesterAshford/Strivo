import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { withMobileAuth } from "@/lib/auth/mobile";
import { importBatches } from "@/db/schema";

export const runtime = "nodejs";

/** List the workspace's import batches, newest first — the import history UI. */
export async function GET(req: Request) {
  return withMobileAuth(req, async (db, workspace) => {
    const batches = await db
      .select()
      .from(importBatches)
      .where(eq(importBatches.workspaceId, workspace.id))
      .orderBy(desc(importBatches.createdAt));

    return NextResponse.json({
      batches: batches.map((b) => ({
        id: b.id,
        source: b.source,
        fileName: b.fileName,
        rowCount: b.rowCount,
        insertedCount: b.insertedCount,
        skippedCount: b.skippedCount,
        createdAt: b.createdAt.toISOString(),
      })),
    });
  });
}
