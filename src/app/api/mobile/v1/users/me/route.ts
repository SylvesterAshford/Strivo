import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  authenticateMobileRequest,
  getOrCreateMobileWorkspace,
  withWorkspaceScope,
} from "@/lib/auth/mobile";
import { sql, eq } from "drizzle-orm";
import { users, workspaces } from "@/db/schema";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Delete the authenticated user, their workspace, and every row that
 * cascades from the workspace (facts, voice_recordings).
 *
 * Also removes the Supabase auth user when AUTH_BYPASS is off and a
 * SUPABASE_SERVICE_ROLE_KEY is configured. Skipping that step leaves
 * the auth record orphaned — acceptable for dev.
 */
export async function DELETE(req: Request) {
  const user = await authenticateMobileRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await getOrCreateMobileWorkspace(user);

  // Delete inside a scoped transaction so RLS allows the writes.
  // FK CASCADE from workspaces removes facts and voice_recordings.
  await withWorkspaceScope(workspace.id, async (tx) => {
    await tx.execute(sql`SELECT set_config('app.user_id', ${user.id}, true)`);
    await tx.delete(workspaces).where(eq(workspaces.id, workspace.id));
    await tx.delete(users).where(eq(users.id, user.id));
  });

  // Best-effort cleanup of the Supabase auth row. Requires service-role key.
  if (!env.authBypass && env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createClient(env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await admin.auth.admin.deleteUser(user.id);
    } catch (err) {
      console.warn("[users.delete] Supabase admin delete failed (continuing):", err);
    }
  }

  return NextResponse.json({ deleted: true });
}
