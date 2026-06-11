// Surgical creation of the advisor_action_events table. The project uses
// db:push / manual SQL rather than a clean migrate chain (the meta chain is
// broken), so we create this one table directly. Requires the OWNER role for
// DDL — reads DATABASE_URL_OWNER, not the pooled app role.
//
// Run:  npx tsx --env-file=.env.local scripts/create-advisor-table.ts

import postgres from "postgres";

const url = process.env.DATABASE_URL_OWNER;
if (!url) {
  console.error("DATABASE_URL_OWNER is not set");
  process.exit(1);
}

const sqlc = postgres(url, { prepare: false });

async function main() {
  await sqlc`
    CREATE TABLE IF NOT EXISTS "advisor_action_events" (
      "id" text PRIMARY KEY NOT NULL,
      "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
      "action_key" text NOT NULL,
      "status" text NOT NULL,
      "period_month" text,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `;
  await sqlc`CREATE INDEX IF NOT EXISTS "aae_workspace_idx" ON "advisor_action_events" ("workspace_id")`;
  console.log("advisor_action_events table + index ready");
  await sqlc.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
