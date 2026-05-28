import { db } from "@/db/client";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS insights_json jsonb`);
  await db.execute(sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS insights_generated_at timestamp`);
  await db.execute(sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS insights_status text DEFAULT 'idle'`);
  console.log("✓ insights cache columns ready on workspaces");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
