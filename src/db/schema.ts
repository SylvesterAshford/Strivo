import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
  jsonb,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// === USERS & WORKSPACES ===

// Users are managed by Clerk; we just store a row to associate Clerk user_id with our data.
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user_id
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// One workspace per user in v1. workspace_id is used as group_id in Zep.
export const workspaces = pgTable(
  "workspaces",
  {
    id: text("id").primaryKey(), // `ws_<cuid2>`
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    businessDescription: text("business_description"),
    competitors: jsonb("competitors").$type<string[]>().default([]),
    segments: jsonb("segments").$type<string[]>().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    ownerIdx: index("workspace_owner_idx").on(t.ownerId),
  })
);

// === MATERIALS ===

export const materials = pgTable(
  "materials",
  {
    id: text("id").primaryKey(), // `mat_<cuid2>`
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().$type<"file" | "url" | "text">(),
    title: text("title").notNull(),
    sourceUrl: text("source_url"),
    storagePath: text("storage_path"),
    contentText: text("content_text").notNull(),
    contentHash: text("content_hash").notNull(),
    contextNote: text("context_note"),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
    processedAt: timestamp("processed_at"),
    processingStatus: text("processing_status")
      .notNull()
      .$type<"pending" | "extracting" | "complete" | "failed">()
      .default("pending"),
    processingError: text("processing_error"),
    entitiesAdded: integer("entities_added").default(0),
    entitiesUpdated: integer("entities_updated").default(0),
    edgesAdded: integer("edges_added").default(0),
    factsSuperseded: integer("facts_superseded").default(0),
  },
  (t) => ({
    workspaceIdx: index("material_workspace_idx").on(t.workspaceId),
    workspaceHashIdx: uniqueIndex("material_workspace_hash_idx").on(
      t.workspaceId,
      t.contentHash
    ),
  })
);

// === ENTITIES (cached from Zep) ===

export const entities = pgTable(
  "entities",
  {
    id: text("id").primaryKey(), // matches Zep entity UUID
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    summary: text("summary"),
    positionX: real("position_x"),
    positionY: real("position_y"),
    pinnedToCenter: boolean("pinned_to_center").default(false),
    hidden: boolean("hidden").default(false),
    zepEntityId: text("zep_entity_id").notNull(),
    firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
    connectionCount: integer("connection_count").default(0),
  },
  (t) => ({
    workspaceIdx: index("entity_workspace_idx").on(t.workspaceId),
    workspaceZepIdx: uniqueIndex("entity_workspace_zep_idx").on(
      t.workspaceId,
      t.zepEntityId
    ),
  })
);

export const entitySummaries = pgTable(
  "entity_summaries",
  {
    id: text("id").primaryKey(),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    timeframe: text("timeframe")
      .notNull()
      .$type<"week" | "month" | "quarter" | "year" | "all">(),
    branchId: text("branch_id"), // null = main branch
    summary: text("summary").notNull(),
    strategicRead: text("strategic_read").notNull(),
    generatedAt: timestamp("generated_at").defaultNow().notNull(),
    inputHash: text("input_hash").notNull(),
  },
  (t) => ({
    entityTimeframeBranchIdx: uniqueIndex("entity_summary_unique_idx").on(
      t.entityId,
      t.timeframe,
      t.branchId
    ),
  })
);

// === EDGES (cached from Zep) ===

export const edges = pgTable(
  "edges",
  {
    id: text("id").primaryKey(), // matches Zep edge UUID
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    fromEntityId: text("from_entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    toEntityId: text("to_entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    weight: real("weight").default(1),
    validFrom: timestamp("valid_from").notNull(),
    validUntil: timestamp("valid_until"),
    zepEdgeId: text("zep_edge_id").notNull(),
  },
  (t) => ({
    workspaceIdx: index("edge_workspace_idx").on(t.workspaceId),
    fromIdx: index("edge_from_idx").on(t.fromEntityId),
    toIdx: index("edge_to_idx").on(t.toEntityId),
  })
);

// === MENTIONS ===

export const mentions = pgTable(
  "mentions",
  {
    id: text("id").primaryKey(),
    materialId: text("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    passage: text("passage").notNull(),
    passageStart: integer("passage_start"),
    passageEnd: integer("passage_end"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    materialIdx: index("mention_material_idx").on(t.materialId),
    entityIdx: index("mention_entity_idx").on(t.entityId),
  })
);

// === BRANCHES ===

export const branches = pgTable(
  "branches",
  {
    id: text("id").primaryKey(), // `br_<cuid2>` or 'main'
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    parentBranchId: text("parent_branch_id"),
    valence: text("valence")
      .notNull()
      .$type<"main" | "favorable" | "neutral" | "contested" | "adverse">(),
    probability: integer("probability").notNull(),
    description: text("description").notNull(),
    triggerEvent: text("trigger_event"),
    divergeAt: real("diverge_at").notNull(),
    divergeY: real("diverge_y").default(0),
    origin: text("origin").notNull().$type<"system" | "user" | "simulation">(),
    simulationId: text("simulation_id"),
    zepGroupId: text("zep_group_id").notNull(),
    involvedEntityIds: jsonb("involved_entity_ids").$type<string[]>().default([]),
    isStale: boolean("is_stale").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    workspaceIdx: index("branch_workspace_idx").on(t.workspaceId),
    workspaceNameIdx: uniqueIndex("branch_workspace_name_idx").on(
      t.workspaceId,
      t.name
    ),
  })
);

export const commits = pgTable(
  "commits",
  {
    id: text("id").primaryKey(),
    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    t: real("t").notNull(),
    kind: text("kind")
      .notNull()
      .$type<"present" | "event" | "decision" | "terminus">(),
    description: text("description").notNull(),
    date: text("date"),
    affectedEntityIds: jsonb("affected_entity_ids")
      .$type<string[]>()
      .default([]),
    projectedEntities: jsonb("projected_entities")
      .$type<Array<{ name: string; kind: string; id: string }>>()
      .default([]),
    projectedEdges: jsonb("projected_edges")
      .$type<Array<{ from: string; to: string; kind: string }>>()
      .default([]),
    orderIndex: integer("order_index").notNull(),
  },
  (t) => ({
    branchIdx: index("commit_branch_idx").on(t.branchId),
  })
);

// === SIMULATIONS ===

export const simulations = pgTable(
  "simulations",
  {
    id: text("id").primaryKey(), // `sim_<cuid2>`
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    decisionPrompt: text("decision_prompt").notNull(),
    agentCount: integer("agent_count").notNull(),
    competitorCount: integer("competitor_count").notNull(),
    customerCount: integer("customer_count").notNull(),
    marketCount: integer("market_count").notNull(),
    horizonWeeks: integer("horizon_weeks").notNull(),
    status: text("status")
      .notNull()
      .$type<"pending" | "running" | "complete" | "failed" | "cancelled">()
      .default("pending"),
    verdictHeadline: text("verdict_headline"),
    verdictConfidence: integer("verdict_confidence"),
    scenarios: jsonb("scenarios").$type<
      Array<{ title: string; probability: number; description: string }>
    >(),
    keyDynamics: jsonb("key_dynamics").$type<string[]>(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    costUsd: real("cost_usd"),
    branchId: text("branch_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    workspaceIdx: index("simulation_workspace_idx").on(t.workspaceId),
  })
);

export const agents = pgTable(
  "agents",
  {
    id: text("id").primaryKey(),
    simulationId: text("simulation_id")
      .notNull()
      .references(() => simulations.id, { onDelete: "cascade" }),
    entityId: text("entity_id").references(() => entities.id),
    name: text("name").notNull(),
    role: text("role").notNull(),
    persona: text("persona").notNull(),
    category: text("category").notNull(),
    isCritical: boolean("is_critical").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    simulationIdx: index("agent_simulation_idx").on(t.simulationId),
  })
);

export const agentMessages = pgTable(
  "agent_messages",
  {
    id: text("id").primaryKey(),
    simulationId: text("simulation_id")
      .notNull()
      .references(() => simulations.id, { onDelete: "cascade" }),
    agentId: text("agent_id").references(() => agents.id),
    role: text("role").notNull().$type<"user" | "assistant">(),
    content: text("content").notNull(),
    toolCalls: jsonb("tool_calls")
      .$type<Array<{ name: string; input: unknown; output?: unknown }>>()
      .default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    simulationAgentIdx: index("agent_message_idx").on(
      t.simulationId,
      t.agentId
    ),
  })
);

// === RELATIONS ===

export const usersRelations = relations(users, ({ many }) => ({
  workspaces: many(workspaces),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, { fields: [workspaces.ownerId], references: [users.id] }),
  materials: many(materials),
  entities: many(entities),
  edges: many(edges),
  branches: many(branches),
  simulations: many(simulations),
}));

export const materialsRelations = relations(materials, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [materials.workspaceId],
    references: [workspaces.id],
  }),
  mentions: many(mentions),
}));

export const entitiesRelations = relations(entities, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [entities.workspaceId],
    references: [workspaces.id],
  }),
  mentions: many(mentions),
  summaries: many(entitySummaries),
  fromEdges: many(edges, { relationName: "from_edges" }),
  toEdges: many(edges, { relationName: "to_edges" }),
}));

export const edgesRelations = relations(edges, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [edges.workspaceId],
    references: [workspaces.id],
  }),
  fromEntity: one(entities, {
    fields: [edges.fromEntityId],
    references: [entities.id],
    relationName: "from_edges",
  }),
  toEntity: one(entities, {
    fields: [edges.toEntityId],
    references: [entities.id],
    relationName: "to_edges",
  }),
}));

export const mentionsRelations = relations(mentions, ({ one }) => ({
  material: one(materials, {
    fields: [mentions.materialId],
    references: [materials.id],
  }),
  entity: one(entities, {
    fields: [mentions.entityId],
    references: [entities.id],
  }),
}));

export const branchesRelations = relations(branches, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [branches.workspaceId],
    references: [workspaces.id],
  }),
  parent: one(branches, {
    fields: [branches.parentBranchId],
    references: [branches.id],
  }),
  commits: many(commits),
  simulation: one(simulations, {
    fields: [branches.simulationId],
    references: [simulations.id],
  }),
}));

export const commitsRelations = relations(commits, ({ one }) => ({
  branch: one(branches, {
    fields: [commits.branchId],
    references: [branches.id],
  }),
}));

export const simulationsRelations = relations(simulations, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [simulations.workspaceId],
    references: [workspaces.id],
  }),
  agents: many(agents),
  messages: many(agentMessages),
  branch: one(branches, {
    fields: [simulations.branchId],
    references: [branches.id],
  }),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  simulation: one(simulations, {
    fields: [agents.simulationId],
    references: [simulations.id],
  }),
  entity: one(entities, {
    fields: [agents.entityId],
    references: [entities.id],
  }),
  messages: many(agentMessages),
}));
