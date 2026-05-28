import { db } from "@/db/client";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "voice_recordings" (
      "id" text PRIMARY KEY NOT NULL,
      "workspace_id" text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      "duration_secs" integer,
      "transcript" text,
      "transcribed_at" timestamp,
      "recorded_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "facts" (
      "id" text PRIMARY KEY NOT NULL,
      "workspace_id" text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      "recording_id" text REFERENCES voice_recordings(id) ON DELETE SET NULL,
      "kind" text NOT NULL,
      "amount_mmk" integer,
      "description" text NOT NULL,
      "counterparty" text,
      "occurred_at" timestamp DEFAULT now() NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS voice_recording_workspace_idx ON voice_recordings(workspace_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS fact_workspace_idx ON facts(workspace_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS fact_workspace_date_idx ON facts(workspace_id, occurred_at)`);

  console.log("✓ voice_recordings + facts tables ready");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
