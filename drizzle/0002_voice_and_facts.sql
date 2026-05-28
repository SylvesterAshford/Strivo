CREATE TABLE "voice_recordings" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"duration_secs" integer,
	"transcript" text,
	"transcribed_at" timestamp,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"recording_id" text,
	"kind" text NOT NULL,
	"amount_mmk" integer,
	"description" text NOT NULL,
	"counterparty" text,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "voice_recordings" ADD CONSTRAINT "voice_recordings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_recording_id_voice_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."voice_recordings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "voice_recording_workspace_idx" ON "voice_recordings" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "fact_workspace_idx" ON "facts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "fact_workspace_date_idx" ON "facts" USING btree ("workspace_id","occurred_at");
