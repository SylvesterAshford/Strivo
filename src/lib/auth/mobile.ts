import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { users, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createId } from "@/lib/id";
import { env } from "@/lib/env";

// Server-side Supabase client used only to validate tokens. No session is
// persisted; each request passes its own JWT to auth.getUser().
// Lazy-initialized when Supabase is configured.
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  if (!supabase) {
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabase;
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

// ── Dev bypass ────────────────────────────────────────────────────────────────
// In development, skip JWT validation entirely. Controlled by the AUTH_BYPASS
// env var (defaults true in dev, false in prod).
const DEV_USER: User = {
  id: "dev_local_user",
  aud: "authenticated",
  role: "authenticated",
  email: "dev@local.lattice",
  app_metadata: {},
  user_metadata: {},
  created_at: "2024-01-01T00:00:00.000Z",
};

/**
 * Validate the Supabase JWT on a mobile request. Returns the Supabase user, or
 * null if the header is missing or the token is invalid/expired.
 */
export async function authenticateMobileRequest(req: Request): Promise<User | null> {
  if (env.authBypass) {
    return DEV_USER;
  }

  const sb = getSupabaseClient();
  if (!sb) return null;
  const token = bearerToken(req);
  if (!token) return null;
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

/**
 * Map a Supabase mobile user to a workspace, creating the user row and
 * workspace on first sign-in. Runs inside a transaction with the
 * `app.user_id` session variable set so RLS policies on users/workspaces
 * permit the upsert.
 */
export async function getOrCreateMobileWorkspace(user: User) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.user_id', ${user.id}, true)`);

    const existingUser = await tx.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!existingUser) {
      const email = user.email ?? (user.phone ? `${user.phone}@phone.lattice` : `${user.id}@anon.lattice`);
      await tx.insert(users).values({ id: user.id, email });
    }

    const existing = await tx.query.workspaces.findFirst({
      where: eq(workspaces.ownerId, user.id),
    });
    if (existing) return existing;

    const newWorkspaceId = `ws_${createId()}`;
    await tx.insert(workspaces).values({
      id: newWorkspaceId,
      ownerId: user.id,
      name: "My workspace",
    });

    const created = await tx.query.workspaces.findFirst({
      where: eq(workspaces.id, newWorkspaceId),
    });
    if (!created) throw new Error("Failed to create workspace");
    return created;
  });
}

// ── Per-request scoped wrapper ────────────────────────────────────────────────
//
// Routes use withMobileAuth(req, async (db, workspace) => { ... }) to run
// their body inside a transaction with both `app.user_id` and
// `app.workspace_id` set. RLS policies enforce per-workspace isolation
// regardless of what the route code does — every query inside this
// transaction can only see rows where workspace_id = workspace.id.
//
// The `db` parameter handed to the callback is actually the Drizzle
// transaction. It supports the same query API as the top-level `db`.

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type WorkspaceRow = Awaited<ReturnType<typeof getOrCreateMobileWorkspace>>;

/**
 * Authenticate the request, resolve the workspace, then run `fn` inside a
 * transaction with RLS session variables set. Returns whatever the callback
 * returns, or a 401 Response if the caller is unauthenticated.
 */
export async function withMobileAuth<T>(
  req: Request,
  fn: (tx: Tx, workspace: WorkspaceRow, user: User) => Promise<T>
): Promise<T | NextResponse> {
  const user = await authenticateMobileRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await getOrCreateMobileWorkspace(user);

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.user_id', ${user.id}, true)`);
    await tx.execute(sql`SELECT set_config('app.workspace_id', ${workspace.id}, true)`);
    return fn(tx, workspace, user);
  });
}

/**
 * Run a callback in a scoped transaction without auth. Use this when a
 * background job (or a route that already authenticated separately) needs
 * to make DB queries with RLS satisfied.
 */
export async function withWorkspaceScope<T>(
  workspaceId: string,
  fn: (tx: Tx) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.workspace_id', ${workspaceId}, true)`);
    return fn(tx);
  });
}

export type { Tx, WorkspaceRow };
