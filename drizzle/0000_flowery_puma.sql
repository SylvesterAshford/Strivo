CREATE TABLE "agent_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"simulation_id" text NOT NULL,
	"agent_id" text,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"tool_calls" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" text PRIMARY KEY NOT NULL,
	"simulation_id" text NOT NULL,
	"entity_id" text,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"persona" text NOT NULL,
	"category" text NOT NULL,
	"is_critical" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"parent_branch_id" text,
	"valence" text NOT NULL,
	"probability" integer NOT NULL,
	"description" text NOT NULL,
	"trigger_event" text,
	"diverge_at" real NOT NULL,
	"diverge_y" real DEFAULT 0,
	"origin" text NOT NULL,
	"simulation_id" text,
	"zep_group_id" text NOT NULL,
	"involved_entity_ids" jsonb DEFAULT '[]'::jsonb,
	"is_stale" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commits" (
	"id" text PRIMARY KEY NOT NULL,
	"branch_id" text NOT NULL,
	"t" real NOT NULL,
	"kind" text NOT NULL,
	"description" text NOT NULL,
	"date" text,
	"affected_entity_ids" jsonb DEFAULT '[]'::jsonb,
	"projected_entities" jsonb DEFAULT '[]'::jsonb,
	"projected_edges" jsonb DEFAULT '[]'::jsonb,
	"order_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "edges" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"from_entity_id" text NOT NULL,
	"to_entity_id" text NOT NULL,
	"kind" text NOT NULL,
	"weight" real DEFAULT 1,
	"valid_from" timestamp NOT NULL,
	"valid_until" timestamp,
	"zep_edge_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"summary" text,
	"position_x" real,
	"position_y" real,
	"pinned_to_center" boolean DEFAULT false,
	"hidden" boolean DEFAULT false,
	"zep_entity_id" text NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"connection_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "entity_summaries" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_id" text NOT NULL,
	"timeframe" text NOT NULL,
	"branch_id" text,
	"summary" text NOT NULL,
	"strategic_read" text NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"input_hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"source_url" text,
	"storage_path" text,
	"content_text" text NOT NULL,
	"content_hash" text NOT NULL,
	"context_note" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"processing_status" text DEFAULT 'pending' NOT NULL,
	"processing_error" text,
	"entities_added" integer DEFAULT 0,
	"entities_updated" integer DEFAULT 0,
	"edges_added" integer DEFAULT 0,
	"facts_superseded" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "mentions" (
	"id" text PRIMARY KEY NOT NULL,
	"material_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"passage" text NOT NULL,
	"passage_start" integer,
	"passage_end" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"decision_prompt" text NOT NULL,
	"agent_count" integer NOT NULL,
	"competitor_count" integer NOT NULL,
	"customer_count" integer NOT NULL,
	"market_count" integer NOT NULL,
	"horizon_weeks" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"verdict_headline" text,
	"verdict_confidence" integer,
	"scenarios" jsonb,
	"key_dynamics" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"cost_usd" real,
	"branch_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"business_description" text,
	"competitors" jsonb DEFAULT '[]'::jsonb,
	"segments" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_simulation_id_simulations_id_fk" FOREIGN KEY ("simulation_id") REFERENCES "public"."simulations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_simulation_id_simulations_id_fk" FOREIGN KEY ("simulation_id") REFERENCES "public"."simulations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commits" ADD CONSTRAINT "commits_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_from_entity_id_entities_id_fk" FOREIGN KEY ("from_entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_to_entity_id_entities_id_fk" FOREIGN KEY ("to_entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_summaries" ADD CONSTRAINT "entity_summaries_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_message_idx" ON "agent_messages" USING btree ("simulation_id","agent_id");--> statement-breakpoint
CREATE INDEX "agent_simulation_idx" ON "agents" USING btree ("simulation_id");--> statement-breakpoint
CREATE INDEX "branch_workspace_idx" ON "branches" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_workspace_name_idx" ON "branches" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "commit_branch_idx" ON "commits" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "edge_workspace_idx" ON "edges" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "edge_from_idx" ON "edges" USING btree ("from_entity_id");--> statement-breakpoint
CREATE INDEX "edge_to_idx" ON "edges" USING btree ("to_entity_id");--> statement-breakpoint
CREATE INDEX "entity_workspace_idx" ON "entities" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_workspace_zep_idx" ON "entities" USING btree ("workspace_id","zep_entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_summary_unique_idx" ON "entity_summaries" USING btree ("entity_id","timeframe","branch_id");--> statement-breakpoint
CREATE INDEX "material_workspace_idx" ON "materials" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "material_workspace_hash_idx" ON "materials" USING btree ("workspace_id","content_hash");--> statement-breakpoint
CREATE INDEX "mention_material_idx" ON "mentions" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "mention_entity_idx" ON "mentions" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "simulation_workspace_idx" ON "simulations" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_owner_idx" ON "workspaces" USING btree ("owner_id");