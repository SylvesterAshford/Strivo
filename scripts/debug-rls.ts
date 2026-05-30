// Diagnose what's failing under RLS by stepping through the auth bridge
// queries one at a time.

import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { users, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const userId = "dev_local_user";

  console.log("=== Test 1: query users WITHOUT session var (should fail with RLS) ===");
  try {
    const r = await db.query.users.findFirst({ where: eq(users.id, userId) });
    console.log("  → returned:", r ?? "null");
  } catch (e) {
    console.log("  → ERROR:", e instanceof Error ? e.message : e);
  }

  console.log("\n=== Test 2: query users WITH session var (should work) ===");
  try {
    const r = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`);
      return tx.query.users.findFirst({ where: eq(users.id, userId) });
    });
    console.log("  → returned:", r ?? "null");
  } catch (e) {
    console.log("  → ERROR:", e instanceof Error ? e.message : e);
  }

  console.log("\n=== Test 3: lookup workspace by owner_id WITH session var ===");
  try {
    const r = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`);
      return tx.query.workspaces.findFirst({ where: eq(workspaces.ownerId, userId) });
    });
    console.log("  → returned:", r ? `ws ${r.id}, name=${r.name}` : "null");
  } catch (e) {
    console.log("  → ERROR:", e instanceof Error ? e.message : e);
  }

  console.log("\n=== Test 4: query facts WITH workspace var ===");
  try {
    const r = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.workspace_id', 'ws_dev_local', true)`);
      return tx.execute(sql`SELECT count(*) FROM facts`);
    });
    console.log("  → fact count:", r);
  } catch (e) {
    console.log("  → ERROR:", e instanceof Error ? e.message : e);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
