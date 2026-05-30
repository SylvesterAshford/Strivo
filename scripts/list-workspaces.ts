import { db } from "@/db/client";
import { sql } from "drizzle-orm";

async function main() {
  // Admin/temporary path: as neondb_owner we can see across workspaces.
  // (strivo_app is NOBYPASSRLS so this script must run as the owner.)
  const dbUrl = process.env.DATABASE_URL_OWNER ?? process.env.DATABASE_URL ?? "";
  console.log("Using URL:", dbUrl.replace(/:[^@]+@/, ":***@"));

  const all = await db.execute(sql`
    SELECT w.id AS workspace_id, w.name, w.owner_id, u.email,
           (SELECT count(*) FROM facts f WHERE f.workspace_id = w.id) AS fact_count,
           w.created_at
    FROM workspaces w
    LEFT JOIN users u ON u.id = w.owner_id
    ORDER BY w.created_at DESC
  `);
  console.log("Workspaces:", all);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
