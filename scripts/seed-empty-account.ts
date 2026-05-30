import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { users } from "@/db/schema";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DB_URL = process.env.DATABASE_URL_OWNER ?? process.env.DATABASE_URL!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const client = postgres(DB_URL, { prepare: false, max: 4 });
const db = drizzle(client, { schema });

const EMAIL = "empty@strivo.test";
const PASSWORD = "EmptyShop!2026";

async function purge(email: string) {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!found) return;
  await db.delete(users).where(sql`${users.id} = ${found.id}`);
  await admin.auth.admin.deleteUser(found.id);
  console.log(`purged previous ${email}`);
}

async function main() {
  await purge(EMAIL);

  const { data: created, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { seeded: true },
  });
  if (error || !created.user) throw new Error(`createUser failed: ${error?.message}`);
  const userId = created.user.id;

  // No DB user/workspace and NO profile fields. On first sign-in the app
  // provisions a bare workspace, and because it has no businessType /
  // productService / sales / expenses, /auth/sync reports onboarded=false —
  // so the onboarding wizard runs, exactly like a brand-new sign-up.

  console.log("\n=== FRESH TEST ACCOUNT (runs onboarding) ===");
  console.log(`  email     : ${EMAIL}`);
  console.log(`  password  : ${PASSWORD}`);
  console.log(`  user id   : ${userId}`);
  console.log(`  state     : no profile, no facts — onboarding wizard shows on login`);
  console.log("============================================\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
