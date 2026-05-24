"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { entities, mentions, edges } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { getOrGenerateEntitySummary } from "@/db/queries/entity-summaries";

export async function loadDrillDown(entityId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const entity = await db.query.entities.findFirst({
    where: eq(entities.id, entityId),
    with: { workspace: true },
  });
  if (!entity) throw new Error("Entity not found");
  if (entity.workspace.ownerId !== userId) throw new Error("Forbidden");

  const [entityMentions, connectedEdges] = await Promise.all([
    db.query.mentions.findMany({
      where: eq(mentions.entityId, entityId),
      with: { material: true },
      orderBy: (m, { desc }) => [desc(m.createdAt)],
    }),
    db.query.edges.findMany({
      where: and(
        eq(edges.workspaceId, entity.workspaceId),
        or(eq(edges.fromEntityId, entityId), eq(edges.toEntityId, entityId)),
      ),
    }),
  ]);

  const connectedEntityIds = [
    ...new Set(
      connectedEdges.map((e) => (e.fromEntityId === entityId ? e.toEntityId : e.fromEntityId)),
    ),
  ];

  const connectedEntitiesRaw =
    connectedEntityIds.length > 0
      ? await db.query.entities.findMany({
          where: (e, { inArray }) => inArray(e.id, connectedEntityIds),
        })
      : [];

  const seenEntityIds = new Set<string>();
  const connectedEntitiesWithKinds = connectedEdges
    .map((edge) => {
      const otherId = edge.fromEntityId === entityId ? edge.toEntityId : edge.fromEntityId;
      const other = connectedEntitiesRaw.find((e) => e.id === otherId);
      return other
        ? { id: other.id, name: other.name, kind: other.kind, relationshipKind: edge.kind }
        : null;
    })
    .filter((c): c is NonNullable<typeof c> => {
      if (c === null) return false;
      if (seenEntityIds.has(c.id)) return false;
      seenEntityIds.add(c.id);
      return true;
    });

  return {
    entity: {
      id: entity.id,
      name: entity.name,
      kind: entity.kind,
      summary: entity.summary,
      firstSeenAt: entity.firstSeenAt,
      lastSeenAt: entity.lastSeenAt,
    },
    mentions: entityMentions.map((m) => ({
      id: m.id,
      materialId: m.materialId,
      materialTitle: m.material.title,
      materialKind: m.material.kind,
      passage: m.passage,
      passageStart: m.passageStart,
      passageEnd: m.passageEnd,
      uploadedAt: m.material.uploadedAt,
    })),
    connectedEntities: connectedEntitiesWithKinds,
  };
}

export async function loadEntitySummary(entityId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const entity = await db.query.entities.findFirst({
    where: eq(entities.id, entityId),
    with: { workspace: true },
  });
  if (!entity) throw new Error("Entity not found");
  if (entity.workspace.ownerId !== userId) throw new Error("Forbidden");

  const entityMentions = await db.query.mentions.findMany({
    where: eq(mentions.entityId, entityId),
    with: { material: true },
  });

  if (entityMentions.length === 0) return null;

  const connectedEdges = await db.query.edges.findMany({
    where: and(
      eq(edges.workspaceId, entity.workspaceId),
      or(eq(edges.fromEntityId, entityId), eq(edges.toEntityId, entityId)),
    ),
  });

  const connectedEntityIds = [
    ...new Set(
      connectedEdges.map((e) => (e.fromEntityId === entityId ? e.toEntityId : e.fromEntityId)),
    ),
  ];

  const connectedEntitiesRaw =
    connectedEntityIds.length > 0
      ? await db.query.entities.findMany({
          where: (e, { inArray }) => inArray(e.id, connectedEntityIds),
        })
      : [];

  const seenIds = new Set<string>();
  const connectedEntitiesWithKinds = connectedEdges
    .map((edge) => {
      const otherId = edge.fromEntityId === entityId ? edge.toEntityId : edge.fromEntityId;
      const other = connectedEntitiesRaw.find((e) => e.id === otherId);
      return other ? { name: other.name, relationshipKind: edge.kind } : null;
    })
    .filter((c): c is NonNullable<typeof c> => {
      if (!c) return false;
      if (seenIds.has(c.name)) return false;
      seenIds.add(c.name);
      return true;
    });

  const cached = await getOrGenerateEntitySummary({
    entityId,
    timeframe: "all",
    branchId: null,
    inputData: {
      entityName: entity.name,
      entityKind: entity.kind,
      workspaceName: entity.workspace.name,
      workspaceDescription: entity.workspace.businessDescription ?? null,
      mentions: entityMentions.map((m) => ({
        materialTitle: m.material.title,
        passage: m.passage,
      })),
      connectedEntities: connectedEntitiesWithKinds.map((c) => ({
        name: c.name,
        relationship: c.relationshipKind,
      })),
    },
  });

  return { summary: cached.summary, strategicRead: cached.strategicRead };
}
