ALTER TABLE "workspaces" ADD COLUMN "branches_status" text DEFAULT 'idle';--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "branches_generated_at" timestamp;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "branches_error" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "graph_state_hash" text;