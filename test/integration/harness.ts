// In-process Postgres (PGlite) integration harness.
//
// Spins up a real Postgres engine in WASM, loads the FULL current schema (via
// `drizzle-kit export` → schema.sql, regenerate with `pnpm test:schema`), and
// exposes a drizzle handle that route tests substitute for @/db/client. This
// lets tests invoke real route handlers end-to-end without a network DB.
//
// NOTE ON RLS: drizzle-kit export does NOT emit the RLS policies (those live in
// scripts/add-rls-policies.ts), so this harness has NO row-level security. The
// home/reports routes filter by workspace_id explicitly, so workspace isolation
// is still exercised here — but at the query level, not the RLS level. Replaying
// RLS into PGlite is a deliberate follow-up (see TODOS.md "extend the harness").

import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema";
import { createId } from "@/lib/id";

export const pg = new PGlite();
export const testDb = drizzle(pg, { schema });

/** Create all tables from the exported schema. Run once per test file. */
export async function loadSchema(): Promise<void> {
  const sqlText = readFileSync(path.resolve(process.cwd(), "test/integration/schema.sql"), "utf8");
  await pg.exec(sqlText);
}

/** Wipe all rows between tests (FK cascade from workspaces clears facts). */
export async function truncateAll(): Promise<void> {
  await pg.exec(`TRUNCATE TABLE facts, import_batches, workspaces, users CASCADE;`);
}

/** Seed a user + workspace with known ids so route auth resolves to them. */
export async function seedWorkspace(userId: string, workspaceId: string): Promise<void> {
  await testDb.insert(schema.users).values({ id: userId, email: `${userId}@test.local` }).onConflictDoNothing();
  await testDb
    .insert(schema.workspaces)
    .values({ id: workspaceId, ownerId: userId, name: "Test WS" })
    .onConflictDoNothing();
}

export interface SeedFact {
  kind: "sale" | "expense" | "receivable" | "note";
  amountMmk?: number;
  occurredAt: string; // ISO
  category?: string;
  description?: string;
}

/** Insert one fact for a workspace. */
export async function seedFact(workspaceId: string, f: SeedFact): Promise<void> {
  await testDb.insert(schema.facts).values({
    id: `fact_${createId()}`,
    workspaceId,
    kind: f.kind,
    amountMmk: f.amountMmk ?? null,
    description: f.description ?? `${f.kind} fact`,
    category: f.category ?? null,
    occurredAt: new Date(f.occurredAt),
  });
}

/** Count a workspace's facts — used to assert import dedupe + batch undo. */
export async function countFacts(workspaceId: string): Promise<number> {
  const res = await pg.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM facts WHERE workspace_id = $1`,
    [workspaceId]
  );
  return res.rows[0]?.n ?? 0;
}
