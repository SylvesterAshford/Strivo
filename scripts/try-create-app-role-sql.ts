import { db } from "@/db/client";
import { sql } from "drizzle-orm";

async function main() {
  // Check if neondb_owner has CREATEROLE
  const me = await db.execute(
    sql`SELECT rolname, rolcreaterole, rolbypassrls FROM pg_roles WHERE rolname = current_user`
  );
  console.log("Current role:", me);

  try {
    // Try direct CREATE ROLE with NOBYPASSRLS — neondb_owner would become owner
    await db.execute(
      sql.raw(`CREATE ROLE strivo_app_v2 NOBYPASSRLS LOGIN PASSWORD 'TempPass_${Date.now()}_x9k2'`)
    );
    console.log("CREATE ROLE strivo_app_v2 NOBYPASSRLS: OK");

    const v2 = await db.execute(
      sql`SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'strivo_app_v2'`
    );
    console.log("v2 status:", v2);
  } catch (e) {
    console.error("CREATE failed:", e);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
