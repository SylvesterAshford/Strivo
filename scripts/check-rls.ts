import { db } from "@/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const role = await db.execute(sql`SELECT current_user as role, current_setting('is_superuser') as super, rolbypassrls FROM pg_roles WHERE rolname = current_user`);
  console.log("Connection role:", role);

  const tables = await db.execute(sql`
    SELECT relname, relrowsecurity AS rls_enabled, relforcerowsecurity AS rls_forced
    FROM pg_class
    WHERE relname IN ('users', 'workspaces', 'facts')
    ORDER BY relname
  `);
  console.log("Table RLS status:", tables);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
