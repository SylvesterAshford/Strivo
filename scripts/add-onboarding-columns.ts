import { db } from "@/db/client";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS pos_enabled boolean`);
  await db.execute(sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS sales_periods jsonb DEFAULT '[]'::jsonb`);
  await db.execute(sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS sales_values jsonb DEFAULT '{}'::jsonb`);
  await db.execute(sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS monthly_expenses_mmk integer`);
  await db.execute(sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS competitor_details jsonb DEFAULT '[]'::jsonb`);
  console.log("✓ onboarding wizard columns ready on workspaces");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
