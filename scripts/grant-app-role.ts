import { db } from "@/db/client";
import { sql } from "drizzle-orm";

/**
 * Grant the new non-BYPASSRLS role (`strivo_app`) the minimum privileges
 * it needs to run the mobile API. Runs as `neondb_owner` (current DATABASE_URL).
 *
 * After this script, swap DATABASE_URL to the strivo_app connection string
 * to activate RLS enforcement.
 */
const ROLE = "strivo_app";

async function main() {
  console.log(`Granting privileges to ${ROLE}...`);

  await db.execute(sql.raw(`GRANT USAGE ON SCHEMA public TO ${ROLE}`));
  await db.execute(
    sql.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${ROLE}`)
  );
  await db.execute(
    sql.raw(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${ROLE}`)
  );

  // Future tables/sequences (e.g., from future migrations) should also be readable.
  await db.execute(
    sql.raw(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${ROLE}`
    )
  );
  await db.execute(
    sql.raw(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${ROLE}`
    )
  );

  // Sanity: confirm the role has NOBYPASSRLS so RLS will actually enforce.
  const rows = await db.execute(
    sql`SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = ${ROLE}`
  );
  console.log("Role status:", rows);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
