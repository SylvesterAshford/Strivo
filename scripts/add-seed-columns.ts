import { db } from "@/db/client";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS customers_seed jsonb DEFAULT '[]'::jsonb`);
  await db.execute(sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS products_seed jsonb DEFAULT '[]'::jsonb`);
  await db.execute(sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS suppliers_seed jsonb DEFAULT '[]'::jsonb`);
  console.log("✓ seed columns ready on workspaces");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
