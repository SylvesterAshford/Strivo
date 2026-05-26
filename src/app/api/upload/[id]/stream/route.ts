import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { materials, entities, edges, mentions, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureGroup, ingestText, getEntities, getEdges, waitForExtraction, ZEP_MAX_CHARS } from "@/lib/zep";
import { createId } from "@/lib/id";
import { log } from "@/lib/log";
import { extractPassages } from "@/lib/extract/llm-passages";
import { env } from "@/lib/env";

export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: materialId } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const material = await db.query.materials.findFirst({
    where: eq(materials.id, materialId),
  });
  if (!material) return new Response("Not found", { status: 404 });

  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, material.workspaceId),
  });
  if (!ws || ws.ownerId !== userId) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      function friendlyError(err: unknown): string {
        const raw = err instanceof Error ? err.message : String(err);
        const jsonStart = raw.indexOf("{");
        if (jsonStart !== -1) {
          try {
            const parsed = JSON.parse(raw.slice(jsonStart)) as { error?: { message?: string } };
            if (parsed.error?.message) return parsed.error.message;
          } catch { /* not JSON */ }
        }
        return raw;
      }

      try {
        send("status", { step: "reading", message: "Reading document..." });
        await db.update(materials)
          .set({ processingStatus: "extracting" })
          .where(eq(materials.id, materialId));

        await ensureGroup(ws.id, ws.name);

        send("status", { step: "extracting", message: "Extracting entities..." });

        const existingEntities = await db.query.entities.findMany({
          where: eq(entities.workspaceId, ws.id),
        });
        const existingEntityIds = new Set(existingEntities.map((e) => e.id));

        const { messageId } = await ingestText({
          groupId: ws.id,
          text: material.contentText,
          source: material.title,
        });

        await waitForExtraction({ groupId: ws.id, messageId });

        const zepEntities = await getEntities(ws.id);
        const zepEdges = await getEdges(ws.id);

        send("status", {
          step: "syncing",
          message: `Found ${zepEntities.length} entities, ${zepEdges.length} relationships.`,
        });

        let entitiesAdded = 0;
        let entitiesUpdated = 0;
        for (const ze of zepEntities) {
          if (existingEntityIds.has(ze.id)) {
            await db
              .update(entities)
              .set({ name: ze.name, kind: ze.kind, summary: ze.summary, lastSeenAt: new Date() })
              .where(eq(entities.id, ze.id));
            entitiesUpdated++;
          } else {
            await db.insert(entities).values({
              id: ze.id,
              workspaceId: ws.id,
              name: ze.name,
              kind: ze.kind,
              summary: ze.summary,
              zepEntityId: ze.id,
              connectionCount: 0,
            });
            entitiesAdded++;
          }
        }

        const existingEdges = await db.query.edges.findMany({
          where: eq(edges.workspaceId, ws.id),
        });
        const existingEdgeIds = new Set(existingEdges.map((e) => e.id));

        let edgesAdded = 0;
        for (const ze of zepEdges) {
          if (existingEdgeIds.has(ze.id)) continue;
          const hasFrom = zepEntities.some((e) => e.id === ze.fromId);
          const hasTo = zepEntities.some((e) => e.id === ze.toId);
          if (!hasFrom || !hasTo) continue;

          await db.insert(edges).values({
            id: ze.id,
            workspaceId: ws.id,
            fromEntityId: ze.fromId,
            toEntityId: ze.toId,
            kind: "active",
            weight: 1,
            validFrom: new Date(ze.validFrom),
            validUntil: ze.validUntil ? new Date(ze.validUntil) : null,
            zepEdgeId: ze.id,
          });
          edgesAdded++;
        }

        for (const e of zepEntities) {
          const count = zepEdges.filter(
            (edge) => edge.fromId === e.id || edge.toId === e.id,
          ).length;
          await db.update(entities)
            .set({ connectionCount: count })
            .where(eq(entities.id, e.id));
        }

        send("status", { step: "linking", message: "Linking material to entities..." });

        let passages: Awaited<ReturnType<typeof extractPassages>> = [];
        try {
          passages = await extractPassages({
            text: material.contentText.slice(0, ZEP_MAX_CHARS),
            entities: zepEntities.map((e) => ({ id: e.id, name: e.name })),
          });
        } catch (passageErr) {
          log({
            level: "warn",
            message: "material.passage_extraction_failed",
            workspaceId: ws.id,
            meta: { materialId, error: friendlyError(passageErr) },
          });
        }

        for (const p of passages) {
          await db.insert(mentions).values({
            id: `mn_${createId()}`,
            materialId: material.id,
            entityId: p.entityId,
            passage: p.passage,
            passageStart: p.start,
            passageEnd: p.end,
          });
        }

        await db
          .update(materials)
          .set({
            processingStatus: "complete",
            processedAt: new Date(),
            entitiesAdded,
            entitiesUpdated,
            edgesAdded,
            factsSuperseded: 0,
          })
          .where(eq(materials.id, materialId));

        send("complete", {
          materialId: material.id,
          stats: { entitiesAdded, entitiesUpdated, edgesAdded, factsSuperseded: 0 },
        });

        log({
          level: "info",
          message: "material.processed",
          workspaceId: ws.id,
          userId,
          meta: { materialId, entitiesAdded, entitiesUpdated, edgesAdded },
        });

        fetch(`${env.NEXT_PUBLIC_APP_URL}/api/branches/regenerate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId: ws.id }),
        }).catch((err: unknown) => {
          log({
            level: "warn",
            message: "branches.kickoff_failed",
            workspaceId: ws.id,
            meta: { error: err instanceof Error ? err.message : String(err) },
          });
        });
      } catch (err: unknown) {
        const message = friendlyError(err);
        log({
          level: "error",
          message: "material.processing_failed",
          workspaceId: ws?.id,
          meta: { materialId, error: message },
        });
        await db
          .update(materials)
          .set({ processingStatus: "failed", processingError: message })
          .where(eq(materials.id, materialId));
        send("error", { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
