import { createClient, type User } from "@supabase/supabase-js";
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
// In development, skip JWT validation entirely. The mobile app sends no token
// and the backend returns a stable fake user so every API route works.
// NEVER ship this to production — the guard is NODE_ENV, not a flag.
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
 *
 * When AUTH_BYPASS is true (default in development), returns the DEV_USER stub
 * so the mobile app can be tested without a real Supabase session.
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
 * workspace on first sign-in. One workspace per user, mirroring the web flow.
 */
export async function getOrCreateMobileWorkspace(user: User) {
  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  });

  if (!existingUser) {
    const email = user.email ?? (user.phone ? `${user.phone}@phone.lattice` : `${user.id}@anon.lattice`);
    await db.insert(users).values({ id: user.id, email });
  }

  const existing = await db.query.workspaces.findFirst({
    where: eq(workspaces.ownerId, user.id),
  });
  if (existing) return existing;

  const newWorkspaceId = `ws_${createId()}`;
  await db.insert(workspaces).values({
    id: newWorkspaceId,
    ownerId: user.id,
    name: "My workspace",
  });

  const created = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, newWorkspaceId),
  });
  if (!created) throw new Error("Failed to create workspace");
  return created;
}
