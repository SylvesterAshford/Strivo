import { NextResponse } from "next/server";
import { z } from "zod";
import { withMobileAuth } from "@/lib/auth/mobile";
import { facts } from "@/db/schema";
import { createId } from "@/lib/id";
import { factKinds } from "@/lib/extraction/mobile-facts";
import { triggerInsightsRegen } from "@/lib/insights/cache";

const ConfirmBody = z.object({
  facts: z.array(
    z.object({
      kind: z.enum(factKinds),
      amountMmk: z.number().int().min(0).optional(),
      description: z.string().min(1),
      counterparty: z.string().optional(),
      category: z.string().max(40).optional(),
      // Structured product enrichment — sale facts only (input contract).
      productName: z.string().max(80).optional(),
      quantity: z.number().int().min(1).max(100_000).optional(),
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
      kind: f.kind,
      amountMmk: f.amountMmk ?? null,
      description: f.description,
      counterparty: f.counterparty ?? null,
      category: f.category ?? null,
      productName: f.kind === "sale" ? (f.productName ?? null) : null,
      quantity: f.kind === "sale" ? (f.quantity ?? null) : null,
      unitPriceMmk:
        f.kind === "sale" && f.amountMmk && f.quantity ? Math.round(f.amountMmk / f.quantity) : null,
      occurredAt: now,
      // Manual entry stamps "now" — not a real transaction date. PR2 adds a date
      // picker here that will set this to "explicit".
      occurredAtSource: "estimated" as const,
      createdAt: now,
    }));

    await db.insert(facts).values(rows);

    triggerInsightsRegen(workspace.id);

    return NextResponse.json({ saved: rows.length });
  });
}
