import { NextResponse } from "next/server";
import { z } from "zod";
import { withMobileAuth } from "@/lib/auth/mobile";
import { facts } from "@/db/schema";
import { createId } from "@/lib/id";
import { factKinds } from "@/lib/extraction/mobile-facts";
import { triggerInsightsRegen } from "@/lib/insights/cache";

const ConfirmBody = z.object({
  recordingId: z.string().optional(),
  facts: z.array(
    z.object({
      kind: z.enum(factKinds),
      amountMmk: z.number().int().min(0).optional(),
      description: z.string().min(1),
      counterparty: z.string().optional(),
      category: z.string().max(40).optional(),
    })
  ).min(1),
});

export async function POST(req: Request) {
  const body = ConfirmBody.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  return withMobileAuth(req, async (db, workspace) => {
    const now = new Date();

    const rows = body.data.facts.map((f) => ({
      id: `fact_${createId()}`,
      workspaceId: workspace.id,
      recordingId: body.data.recordingId ?? null,
      kind: f.kind,
      amountMmk: f.amountMmk ?? null,
      description: f.description,
      counterparty: f.counterparty ?? null,
      category: f.category ?? null,
      occurredAt: now,
      createdAt: now,
    }));

    await db.insert(facts).values(rows);

    triggerInsightsRegen(workspace.id);

    return NextResponse.json({ saved: rows.length });
  });
}
