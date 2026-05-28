import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateMobileRequest, getOrCreateMobileWorkspace } from "@/lib/auth/mobile";
import { db } from "@/db/client";
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
    })
  ).min(1),
});

export async function POST(req: Request) {
  const user = await authenticateMobileRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = ConfirmBody.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const workspace = await getOrCreateMobileWorkspace(user);
  const now = new Date();

  const rows = body.data.facts.map((f) => ({
    id: `fact_${createId()}`,
    workspaceId: workspace.id,
    recordingId: body.data.recordingId ?? null,
    kind: f.kind,
    amountMmk: f.amountMmk ?? null,
    description: f.description,
    counterparty: f.counterparty ?? null,
    occurredAt: now,
    createdAt: now,
  }));

  await db.insert(facts).values(rows);

  triggerInsightsRegen(workspace.id);

  return NextResponse.json({ saved: rows.length });
}
