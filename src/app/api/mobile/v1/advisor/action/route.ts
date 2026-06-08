import { NextResponse } from "next/server";
import { z } from "zod";
import { withMobileAuth } from "@/lib/auth/mobile";
import { advisorActionEvents } from "@/db/schema";
import { createId } from "@/lib/id";

// The action loop: records whether an owner acted on a recommended action.
// This is the primary success signal for the Advisor — did advice lead to action.
// Writes are workspace-scoped by RLS (set inside withMobileAuth); the body is
// Zod-validated so a bad client can't write garbage keys/statuses.
const bodySchema = z.object({
  actionKey: z.enum(["review_top_expense", "follow_up_receivables", "record_more", "keep_recording"]),
  status: z.enum(["done", "skip"]),
  periodMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

export async function POST(req: Request) {
  return withMobileAuth(req, async (db, workspace) => {
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", detail: parsed.error.flatten() }, { status: 400 });
    }
    const { actionKey, status, periodMonth } = parsed.data;
    await db.insert(advisorActionEvents).values({
      id: `aae_${createId()}`,
      workspaceId: workspace.id,
      actionKey,
      status,
      periodMonth: periodMonth ?? null,
    });
    return NextResponse.json({ ok: true });
  });
}
