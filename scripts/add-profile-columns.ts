import { db } from "@/db/client";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS business_type text`);
  await db.execute(sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS product_service text`);
  await db.execute(sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS location text`);
  await db.execute(sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS monthly_target_mmk integer`);
  await db.execute(sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS biggest_challenge text`);
  await db.execute(sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS budget_mmk integer`);
  console.log("✓ business profile columns ready on workspaces");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
