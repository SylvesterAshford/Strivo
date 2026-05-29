import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateMobileRequest, getOrCreateMobileWorkspace } from "@/lib/auth/mobile";
import { db } from "@/db/client";
import { facts } from "@/db/schema";
import { createId } from "@/lib/id";
import { extractFacts } from "@/lib/extraction/mobile-facts";
import { triggerInsightsRegen } from "@/lib/insights/cache";

export const runtime = "nodejs";
// Burmese fact extraction can be slow when Gemini is overloaded (3 retries
// with backoff). Give the route plenty of headroom so it isn't killed
// before the LLM finishes thinking.
export const maxDuration = 300;

const Body = z.object({
  text: z.string().min(10).max(10_000),
});

export async function POST(req: Request) {
  const user = await authenticateMobileRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let drafts;
  try {
    drafts = await extractFacts(parsed.data.text);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown extraction error";
    console.error("[import.text] extraction failed", err);
    return NextResponse.json({ error: `Extraction failed: ${message}` }, { status: 502 });
  }
  if (drafts.length === 0) {
    return NextResponse.json({ inserted: 0, error: "No facts found in text" }, { status: 200 });
  }

  const workspace = await getOrCreateMobileWorkspace(user);
  const now = new Date();
  const rows = drafts.map((d) => ({
    id: `fact_${createId()}`,
    workspaceId: workspace.id,
    recordingId: null,
    kind: d.kind,
    amountMmk: d.amountMmk ?? null,
    description: d.description.slice(0, 200),
    counterparty: d.counterparty ?? null,
    occurredAt: now,
    createdAt: now,
  }));

  await db.insert(facts).values(rows);
  triggerInsightsRegen(workspace.id);

  return NextResponse.json({ inserted: rows.length });
}
