// One-off data copy for the Neon → Supabase migration (plan Step 3).
//
// Uses Postgres-native COPY streaming (not pg_dump — the local pg_dump is v14 and
// can't dump the v17 servers). COPY round-trips every type correctly, including
// jsonb and timestamps. Source is the Neon OWNER role (BYPASSRLS, sees all rows);
// target is Supabase BEFORE RLS is applied, so inserts aren't filtered.
//
// Order matters for FKs. Target is TRUNCATE'd first so the script is re-runnable.
//
// Run:  npx tsx --env-file=.env.local scripts/copy-data.ts

import postgres from "postgres";
import { pipeline } from "node:stream/promises";

const SOURCE_URL = process.env.DATABASE_URL_OWNER; // Neon owner (BYPASSRLS)
const TARGET_URL = process.env.SUPABASE_DIRECT_URL; // Supabase session pooler, pre-RLS

if (!SOURCE_URL || !TARGET_URL) {
  console.error("Need DATABASE_URL_OWNER (Neon) and SUPABASE_DIRECT_URL (Supabase).");
  process.exit(2);
}

// FK-safe insert order. Empty tables are no-ops but kept for completeness.
const ORDER = [
  "users",
  "workspaces",
  "voice_recordings",
  "materials",
  "entities",
  "entity_summaries",
  "branches",
  "simulations",
  "agents",
  "facts",
  "edges",
  "mentions",
  "commits",
  "agent_messages",
  "advisor_action_events",
];

const source = postgres(SOURCE_URL, { prepare: false, max: 1 });
const target = postgres(TARGET_URL, { prepare: false, max: 1 });

async function columns(sql: postgres.Sql, table: string): Promise<string[]> {
  const rows = await sql<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}
    ORDER BY ordinal_position`;
  return rows.map((r) => r.column_name);
}

async function count(sql: postgres.Sql, table: string): Promise<number> {
  const [r] = await sql<{ c: string }[]>`SELECT count(*)::text AS c FROM ${sql(table)}`;
  return parseInt(r.c, 10);
}

async function main() {
  // Clear target (reverse order via CASCADE handles FKs in one shot).
  console.log("Truncating target tables…");
  await target.unsafe(`TRUNCATE TABLE ${ORDER.map((t) => `"${t}"`).join(", ")} CASCADE`);

  for (const table of ORDER) {
    const srcCount = await count(source, table);
    if (srcCount === 0) {
      console.log(`  · ${table}: 0 rows (skip)`);
      continue;
    }
    // Explicit, target-aligned column list so COPY order can't drift.
    const cols = await columns(target, table);
    const colList = cols.map((c) => `"${c}"`).join(", ");

    const readable = await source`COPY (SELECT ${source.unsafe(colList)} FROM ${source(table)}) TO STDOUT`.readable();
    const writable = await target`COPY ${target(table)} (${target.unsafe(colList)}) FROM STDIN`.writable();
    await pipeline(readable, writable);

    const tgtCount = await count(target, table);
    const okMark = tgtCount === srcCount ? "✓" : "✗";
    console.log(`  ${okMark} ${table}: ${srcCount} → ${tgtCount}`);
  }

  await Promise.all([source.end(), target.end()]);
  console.log("Data copy complete.");
}

main().catch(async (e) => {
  console.error(e);
  await Promise.all([source.end(), target.end()]).catch(() => {});
  process.exit(1);
});
