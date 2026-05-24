"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { entities, materials } from "@/db/schema";
import { and, eq, ilike } from "drizzle-orm";
import { requireWorkspace } from "@/lib/workspace";

export async function searchAll(query: string) {
  const { userId } = await auth();
  if (!userId) return { entities: [], materials: [] };

  const trimmed = query.trim();
  if (trimmed.length < 1) return { entities: [], materials: [] };

  const ws = await requireWorkspace();
  const pattern = `%${trimmed}%`;

  const [entityResults, materialResults] = await Promise.all([
    db.query.entities.findMany({
      where: and(eq(entities.workspaceId, ws.id), ilike(entities.name, pattern)),
      limit: 8,
    }),
    db.query.materials.findMany({
      where: and(eq(materials.workspaceId, ws.id), ilike(materials.title, pattern)),
      limit: 5,
    }),
  ]);

  return {
    entities: entityResults.map((e) => ({ id: e.id, name: e.name, kind: e.kind })),
    materials: materialResults.map((m) => ({ id: m.id, title: m.title })),
  };
}
