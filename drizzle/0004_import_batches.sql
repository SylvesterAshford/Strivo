-- 0004: Import batches — one row per upload event. Powers the "previous
-- imports" history UI, per-batch undo (CASCADE delete), and count-aware
-- re-import dedupe. Run after 0003.
CREATE TABLE IF NOT EXISTS "import_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"source" text NOT NULL,
	"file_name" text,
	"row_count" integer NOT NULL,
	"inserted_count" integer NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "import_batch_workspace_idx" ON "import_batches" USING btree ("workspace_id");
--> statement-breakpoint
ALTER TABLE "facts" ADD COLUMN IF NOT EXISTS "batch_id" text;
--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- RLS: same workspace-isolation policy shape as facts.
ALTER TABLE "import_batches" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "import_batches" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS import_batches_isolation ON import_batches;
--> statement-breakpoint
CREATE POLICY import_batches_isolation ON import_batches
  FOR ALL
  USING (workspace_id = current_setting('app.workspace_id', true))
  WITH CHECK (workspace_id = current_setting('app.workspace_id', true));
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON import_batches TO strivo_app;
