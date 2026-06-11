// Enables Row Level Security on every workspace-scoped table and creates
// policies that gate access via the Postgres session variable
// `app.workspace_id`. The backend wraps every request in a transaction that
// sets this variable to the authenticated user's workspace before running
// any query, so queries that forget the explicit workspace filter are still
// safe — the database itself refuses to return cross-workspace rows.
//
// FORCE RLS makes the policies apply to all roles, including the connection
// role used by the app, so we don't need a separate non-superuser role.
//
// Re-runnable: every statement uses IF EXISTS / IF NOT EXISTS or DROP + CREATE.
//
// Run:  npx tsx --env-file=.env.local scripts/add-rls-policies.ts

import { db } from "@/db/client";
import { sql } from "drizzle-orm";

const TABLES = [
  // workspace-scoped business data
  "facts",
  "import_batches",
  "advisor_action_events",
    "workspaces",
  // unused founder tables — still lock down so any future regression is contained
  "materials",
  "entities",
  "edges",
  "mentions",
  "branches",
  "commits",
  "simulations",
  "agents",
  "agent_messages",
  "entity_summaries",
] as const;

async function enableForce(table: string) {
  await db.execute(sql`ALTER TABLE ${sql.identifier(table)} ENABLE ROW LEVEL SECURITY`);
  await db.execute(sql`ALTER TABLE ${sql.identifier(table)} FORCE ROW LEVEL SECURITY`);
}

async function drop(name: string, table: string) {
  await db.execute(sql`DROP POLICY IF EXISTS ${sql.identifier(name)} ON ${sql.identifier(table)}`);
}

async function main() {
  console.log("Enabling RLS + FORCE on all workspace-scoped tables...");
  for (const t of TABLES) {
    await enableForce(t);
    console.log(`  ✓ ${t}`);
  }

  // ── workspaces ────────────────────────────────────────────────────────
  // SELECT/UPDATE/DELETE: only the workspace whose id matches the session.
  // INSERT: must be by the user identified in app.user_id (set during the
  // auth bridge BEFORE the workspace exists, so we can provision one).
  await drop("workspaces_isolation", "workspaces");
  await drop("workspaces_insert", "workspaces");
  await drop("workspaces_owner_lookup", "workspaces");
  await db.execute(sql`
    CREATE POLICY workspaces_isolation ON workspaces
      FOR ALL
      USING (id = current_setting('app.workspace_id', true))
      WITH CHECK (id = current_setting('app.workspace_id', true))
  `);
  await db.execute(sql`
    CREATE POLICY workspaces_insert ON workspaces
      FOR INSERT
      WITH CHECK (owner_id = current_setting('app.user_id', true))
  `);
  // PERMISSIVE: lets getOrCreateMobileWorkspace look up the user's workspace
  // before any workspace context is known. This policy only matches when
  // app.user_id is set (during the auth bootstrap transaction).
  await db.execute(sql`
    CREATE POLICY workspaces_owner_lookup ON workspaces
      FOR SELECT
      USING (owner_id = current_setting('app.user_id', true))
  `);

  // ── users ─────────────────────────────────────────────────────────────
  // Read your own row (looked up via the session workspace's owner).
  // Insert your own row (bridge sets app.user_id before upserting users).
  await drop("users_self", "users");
  await drop("users_insert", "users");
  await db.execute(sql`ALTER TABLE users ENABLE ROW LEVEL SECURITY`);
  await db.execute(sql`ALTER TABLE users FORCE ROW LEVEL SECURITY`);
  await db.execute(sql`
    CREATE POLICY users_self ON users
      FOR ALL
      USING (id = current_setting('app.user_id', true))
      WITH CHECK (id = current_setting('app.user_id', true))
  `);

  // ── tables with a direct workspace_id column ─────────────────────────
  for (const t of ["facts", "import_batches", "advisor_action_events", "materials", "entities", "edges", "branches", "simulations"]) {
    const policy = `${t}_isolation`;
    await drop(policy, t);
    await db.execute(sql.raw(`
      CREATE POLICY ${policy} ON ${t}
        FOR ALL
        USING (workspace_id = current_setting('app.workspace_id', true))
        WITH CHECK (workspace_id = current_setting('app.workspace_id', true))
    `));
  }

  // ── commits → branches (workspace_id lives on branches) ──────────────
  await drop("commits_isolation", "commits");
  await db.execute(sql.raw(`
    CREATE POLICY commits_isolation ON commits
      FOR ALL
      USING (branch_id IN (SELECT id FROM branches WHERE workspace_id = current_setting('app.workspace_id', true)))
      WITH CHECK (branch_id IN (SELECT id FROM branches WHERE workspace_id = current_setting('app.workspace_id', true)))
  `));

  // ── mentions → materials (workspace_id lives on materials) ───────────
  await drop("mentions_isolation", "mentions");
  await db.execute(sql.raw(`
    CREATE POLICY mentions_isolation ON mentions
      FOR ALL
      USING (material_id IN (SELECT id FROM materials WHERE workspace_id = current_setting('app.workspace_id', true)))
      WITH CHECK (material_id IN (SELECT id FROM materials WHERE workspace_id = current_setting('app.workspace_id', true)))
  `));

  // ── tables joined through a parent ────────────────────────────────────
  // agents → simulations (workspace_id lives on simulations)
  await drop("agents_isolation", "agents");
  await db.execute(sql.raw(`
    CREATE POLICY agents_isolation ON agents
      FOR ALL
      USING (simulation_id IN (SELECT id FROM simulations WHERE workspace_id = current_setting('app.workspace_id', true)))
      WITH CHECK (simulation_id IN (SELECT id FROM simulations WHERE workspace_id = current_setting('app.workspace_id', true)))
  `));

  // agent_messages → simulations
  await drop("agent_messages_isolation", "agent_messages");
  await db.execute(sql.raw(`
    CREATE POLICY agent_messages_isolation ON agent_messages
      FOR ALL
      USING (simulation_id IN (SELECT id FROM simulations WHERE workspace_id = current_setting('app.workspace_id', true)))
      WITH CHECK (simulation_id IN (SELECT id FROM simulations WHERE workspace_id = current_setting('app.workspace_id', true)))
  `));

  // entity_summaries → entities (workspace_id lives on entities)
  await drop("entity_summaries_isolation", "entity_summaries");
  await db.execute(sql.raw(`
    CREATE POLICY entity_summaries_isolation ON entity_summaries
      FOR ALL
      USING (entity_id IN (SELECT id FROM entities WHERE workspace_id = current_setting('app.workspace_id', true)))
      WITH CHECK (entity_id IN (SELECT id FROM entities WHERE workspace_id = current_setting('app.workspace_id', true)))
  `));

  console.log("\n✓ RLS policies installed. Every workspace-scoped table is now locked");
  console.log("  to the session variable `app.workspace_id`. Routes must run inside");
  console.log("  withMobileAuth() / withWorkspaceScope() for any query to return rows.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
