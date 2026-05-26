import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { regenerateBranches } from "@/lib/branches/store";
import { z } from "zod";

export const maxDuration = 60;

const BodySchema = z.object({
  workspaceId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, parsed.data.workspaceId),
  });
  if (!ws || ws.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await regenerateBranches(parsed.data.workspaceId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Branch generation failed" },
      { status: 500 },
    );
  }
}
