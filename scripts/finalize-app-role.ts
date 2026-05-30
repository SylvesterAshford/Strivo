import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { randomBytes } from "crypto";

/**
 * Create the final non-BYPASSRLS app role and grant it the minimum privileges
 * the mobile API needs. Drops any prior `strivo_app` (which got BYPASSRLS via
 * the Neon control plane). Prints the connection string at the end.
 */
async function main() {
  const password = randomBytes(24).toString("base64url");
  const ROLE = "strivo_app";

  // Drop the bogus control-plane role and the v2 we just created.
  try {
    await db.execute(sql.raw(`DROP ROLE IF EXISTS strivo_app_v2`));
    console.log("Dropped strivo_app_v2");
  } catch (e) {
    console.warn("Drop v2 warning:", e instanceof Error ? e.message : e);
  }
  try {
    await db.execute(sql.raw(`DROP ROLE IF EXISTS ${ROLE}`));
    console.log(`Dropped existing ${ROLE}`);
  } catch (e) {
    console.warn("Drop role warning:", e instanceof Error ? e.message : e);
  }

  // Create fresh role via SQL so neondb_owner is the owner and the NOBYPASSRLS
  // attribute sticks.
  await db.execute(
    sql.raw(`CREATE ROLE ${ROLE} NOBYPASSRLS LOGIN PASSWORD '${password}'`)
  );
  console.log(`Created ${ROLE} NOBYPASSRLS`);

  // Privileges
  await db.execute(sql.raw(`GRANT USAGE ON SCHEMA public TO ${ROLE}`));
  await db.execute(
    sql.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${ROLE}`)
  );
  await db.execute(
    sql.raw(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${ROLE}`)
  );
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

  const status = await db.execute(
    sql`SELECT rolname, rolbypassrls, rolcanlogin FROM pg_roles WHERE rolname = ${ROLE}`
  );
  console.log("Role status:", status);

  const cs = `postgresql://${ROLE}:${password}@ep-frosty-bonus-ap33yeen-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`;
  console.log("\n=== CONNECTION STRING (copy into .env.local DATABASE_URL) ===");
  console.log(cs);
  console.log("=== END ===\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
