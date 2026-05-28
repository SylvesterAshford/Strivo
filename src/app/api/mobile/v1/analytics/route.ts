import { NextResponse } from "next/server";
import { authenticateMobileRequest, getOrCreateMobileWorkspace } from "@/lib/auth/mobile";
import { db } from "@/db/client";
import { facts } from "@/db/schema";
import { eq, and, gte, desc, sum, count, sql } from "drizzle-orm";

export async function GET(req: Request) {
  const user = await authenticateMobileRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await getOrCreateMobileWorkspace(user);
  const wsId = workspace.id;

  // 30-day window
  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);
  since30.setHours(0, 0, 0, 0);

  // === Kind breakdown (30 days) ===
  const kindRows = await db
    .select({
      kind: facts.kind,
      totalMmk: sum(facts.amountMmk),
      count: count(),
    })
    .from(facts)
    .where(and(eq(facts.workspaceId, wsId), gte(facts.occurredAt, since30)))
    .groupBy(facts.kind);

  // === Top counterparties by sales (30 days) ===
  const topRows = await db
    .select({
      counterparty: facts.counterparty,
      totalMmk: sum(facts.amountMmk),
      count: count(),
    })
    .from(facts)
    .where(
      and(
        eq(facts.workspaceId, wsId),
        eq(facts.kind, "sale"),
        gte(facts.occurredAt, since30),
        sql`${facts.counterparty} IS NOT NULL`
      )
    )
    .groupBy(facts.counterparty)
    .orderBy(desc(sum(facts.amountMmk)))
    .limit(5);

  // === Recent entries (last 10 facts, any kind) ===
  const recent = await db
    .select({
      id: facts.id,
      kind: facts.kind,
      description: facts.description,
      amountMmk: facts.amountMmk,
      counterparty: facts.counterparty,
      occurredAt: facts.occurredAt,
    })
    .from(facts)
    .where(eq(facts.workspaceId, wsId))
    .orderBy(desc(facts.occurredAt))
    .limit(10);

  return NextResponse.json({
    breakdown: kindRows.map((r) => ({
      kind: r.kind,
      totalMmk: parseInt(String(r.totalMmk ?? "0"), 10) || 0,
      count: Number(r.count),
    })),
    topCounterparties: topRows
      .filter((r) => r.counterparty)
      .map((r) => ({
        name: r.counterparty!,
        totalMmk: parseInt(String(r.totalMmk ?? "0"), 10) || 0,
        count: Number(r.count),
      })),
    recent: recent.map((r) => ({
      id: r.id,
      kind: r.kind,
      description: r.description,
      amountMmk: r.amountMmk,
      counterparty: r.counterparty,
      occurredAt: r.occurredAt,
    })),
  });
}
