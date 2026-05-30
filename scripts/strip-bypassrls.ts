import { db } from "@/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const before = await db.execute(
    sql`SELECT rolname, rolbypassrls, rolsuper FROM pg_roles WHERE rolname IN ('neondb_owner', 'strivo_app') ORDER BY rolname`
  );
  console.log("Before:", before);

  try {
    await db.execute(sql.raw(`ALTER ROLE strivo_app NOBYPASSRLS`));
    console.log("ALTER strivo_app NOBYPASSRLS: OK");
  } catch (e) {
    console.error("strivo_app:", e);
    if (e && typeof e === "object") {
      for (const k of Object.keys(e as Record<string, unknown>)) {
        console.error(`  ${k}:`, (e as Record<string, unknown>)[k]);
      }
    }
  }

  const after = await db.execute(
    sql`SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname IN ('neondb_owner', 'strivo_app') ORDER BY rolname`
  );
  console.log("After:", after);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
