import { db } from "@/db/client";
import { sql } from "drizzle-orm";

/**
 * Confirm RLS blocks reads when the session variable is unset, and allows
 * them when it points at the dev workspace.
 */
async function main() {
  console.log("--- Test 1: SELECT without session var (expect 0 rows) ---");
  const noVar = await db.execute(sql`SELECT count(*)::int AS c FROM facts`);
  console.log("Result:", noVar);

  console.log("\n--- Test 2: SELECT with app.workspace_id = ws_dev_local ---");
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.workspace_id', 'ws_dev_local', true)`);
    const withVar = await tx.execute(sql`SELECT count(*)::int AS c FROM facts`);
    console.log("Result:", withVar);
  });

  console.log("\n--- Test 3: cross-workspace INSERT should be rejected ---");
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.workspace_id', 'ws_dev_local', true)`);
      await tx.execute(sql`SELECT set_config('app.user_id', 'dev_user', true)`);
      await tx.execute(sql`
        INSERT INTO facts (id, workspace_id, kind, description, occurred_at)
        VALUES ('test_rls_violation', 'ws_other_workspace', 'note', 'should fail', now())
      `);
    });
    console.log("UNEXPECTED: cross-workspace insert succeeded!");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const cause = (e as { cause?: { message?: string; code?: string } }).cause;
    console.log("Full:", msg);
    if (cause) console.log("Cause:", cause.code, cause.message);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
