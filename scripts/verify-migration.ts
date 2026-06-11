// Post-migration verification for the Neon → Supabase cutover (plan Step 5 + 7).
//
// Runs three checks and exits non-zero on any failure so the cutover can gate on
// it. Safe to run repeatedly — read-only, no writes, no DDL.
//
//   1. Row-count parity  — count(*) per table matches between source and target.
//   2. RLS isolation     — with app.workspace_id = A set, workspace B's facts are
//                          invisible (zero rows). Proves FORCE RLS holds on Supabase.
//   3. Role safety       — the target connection's role is NOT superuser / BYPASSRLS
//                          (such a role silently ignores RLS = isolation off).
//
// Env (all connection strings):
//   VERIFY_SOURCE_URL    Neon (source). No RLS, so used to enumerate tables +
//                        pick two real workspace ids for the isolation test.
//   VERIFY_TARGET_URL    Supabase (target). The role you run the app/migration as.
//   VERIFY_TARGET_APP_URL optional — the POOLED, non-owner runtime string. Falls
//                        back to VERIFY_TARGET_URL. The RLS test is most meaningful
//                        against the actual runtime role.
//
// Run:  npx tsx scripts/verify-migration.ts

import postgres from "postgres";

const SOURCE_URL = process.env.VERIFY_SOURCE_URL;
const TARGET_URL = process.env.VERIFY_TARGET_URL;

if (!SOURCE_URL || !TARGET_URL) {
  console.error("Set VERIFY_SOURCE_URL (Neon) and VERIFY_TARGET_URL (Supabase).");
  process.exit(2);
}

const TARGET_APP_URL = process.env.VERIFY_TARGET_APP_URL ?? TARGET_URL;

// Drizzle's migration bookkeeping table is not app data — don't compare it.
const IGNORE_TABLES = new Set(["__drizzle_migrations"]);

const source = postgres(SOURCE_URL, { prepare: false });
const target = postgres(TARGET_URL, { prepare: false });
const targetApp = TARGET_APP_URL === TARGET_URL ? target : postgres(TARGET_APP_URL, { prepare: false });

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.error(`  ✗ ${msg}`);
};
const ok = (msg: string) => console.log(`  ✓ ${msg}`);

async function publicTables(sql: postgres.Sql): Promise<string[]> {
  const rows = await sql<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name`;
  return rows.map((r) => r.table_name).filter((t) => !IGNORE_TABLES.has(t));
}

async function countRows(sql: postgres.Sql, table: string): Promise<number> {
  const [row] = await sql<{ c: string }[]>`SELECT count(*)::text AS c FROM ${sql(table)}`;
  return parseInt(row.c, 10);
}

// ── 1. Row-count parity ─────────────────────────────────────────────────────
async function checkRowCounts() {
  console.log("\n[1] Row-count parity (source vs target)");
  const srcTables = await publicTables(source);
  const tgtTables = new Set(await publicTables(target));

  for (const t of srcTables) {
    if (!tgtTables.has(t)) {
      fail(`table "${t}" exists on source but not target`);
      continue;
    }
    const [s, d] = await Promise.all([countRows(source, t), countRows(target, t)]);
    if (s === d) ok(`${t}: ${s}`);
    else fail(`${t}: source ${s} ≠ target ${d}`);
  }
  // Tables only on target (e.g. created surgically) — surface but don't fail.
  for (const t of tgtTables) {
    if (!srcTables.includes(t)) console.log(`  · ${t}: target-only (not on source)`);
  }
}

// ── 2. RLS isolation ────────────────────────────────────────────────────────
async function checkIsolation() {
  console.log("\n[2] RLS isolation (workspace A cannot see workspace B)");
  // Pull two distinct workspace ids that have facts, from the source (no RLS).
  const pairs = await source<{ workspace_id: string }[]>`
    SELECT workspace_id FROM facts GROUP BY workspace_id HAVING count(*) > 0 ORDER BY workspace_id LIMIT 2`;
  if (pairs.length < 2) {
    console.log("  · skipped — need ≥2 workspaces with facts to test isolation");
    return;
  }
  const [a, b] = [pairs[0].workspace_id, pairs[1].workspace_id];
  const [bExpected] = await source<{ c: string }[]>`SELECT count(*)::text AS c FROM facts WHERE workspace_id = ${b}`;

  await targetApp.begin(async (tx) => {
    // Transaction-local context, exactly like withMobileAuth.
    await tx`SELECT set_config('app.workspace_id', ${a}, true)`;
    const [visibleB] = await tx<{ c: string }[]>`SELECT count(*)::text AS c FROM facts WHERE workspace_id = ${b}`;
    if (parseInt(visibleB.c, 10) === 0) ok(`as workspace A, workspace B's facts return 0 rows (B has ${bExpected.c} on source)`);
    else fail(`RLS LEAK: as workspace A, saw ${visibleB.c} of workspace B's facts — isolation is OFF`);
  });
}

// ── 3. Role safety ──────────────────────────────────────────────────────────
async function checkRole() {
  console.log("\n[3] Runtime role is not superuser / BYPASSRLS");
  const [role] = await targetApp<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean }[]>`
    SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
  if (!role) return fail("could not resolve current_user role");
  if (role.rolsuper) fail(`role "${role.rolname}" is SUPERUSER — ignores RLS`);
  if (role.rolbypassrls) fail(`role "${role.rolname}" has BYPASSRLS — ignores RLS`);
  if (!role.rolsuper && !role.rolbypassrls) ok(`role "${role.rolname}": not superuser, no BYPASSRLS`);
}

async function main() {
  try {
    await checkRowCounts();
    await checkIsolation();
    await checkRole();
  } finally {
    await Promise.all([source.end(), target.end(), targetApp === target ? Promise.resolve() : targetApp.end()]);
  }
  console.log(failures === 0 ? "\n✅ Migration verification passed." : `\n❌ ${failures} check(s) failed — do NOT cut over.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
