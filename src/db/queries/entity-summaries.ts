import { db } from "@/db/client";
import { entitySummaries } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { createId } from "@/lib/id";
import { generateEntitySummary } from "@/lib/llm/entity-summary";

export async function getOrGenerateEntitySummary(params: {
  entityId: string;
  timeframe: "week" | "month" | "quarter" | "year" | "all";
  branchId: string | null;
  inputData: Parameters<typeof generateEntitySummary>[0];
}) {
  const cached = await db.query.entitySummaries.findFirst({
    where: and(
      eq(entitySummaries.entityId, params.entityId),
      eq(entitySummaries.timeframe, params.timeframe),
      params.branchId
        ? eq(entitySummaries.branchId, params.branchId)
        : isNull(entitySummaries.branchId),
    ),
  });

  if (cached) return cached;

  const generated = await generateEntitySummary(params.inputData);

  const id = `sum_${createId()}`;
  await db.insert(entitySummaries).values({
    id,
    entityId: params.entityId,
    timeframe: params.timeframe,
    branchId: params.branchId,
    summary: generated.summary,
    strategicRead: generated.strategicRead,
    inputHash: generated.inputHash,
  });

  return {
    id,
    entityId: params.entityId,
    timeframe: params.timeframe,
    branchId: params.branchId,
    summary: generated.summary,
    strategicRead: generated.strategicRead,
    inputHash: generated.inputHash,
    generatedAt: new Date(),
  };
}
