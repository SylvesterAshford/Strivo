import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { requireWorkspace } from "@/lib/workspace";
import { db } from "@/db/client";
import { branches } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await requireWorkspace();

  const allBranches = await db.query.branches.findMany({
    where: eq(branches.workspaceId, ws.id),
    with: {
      commits: {
        orderBy: (c, { asc }) => asc(c.orderIndex),
      },
    },
    orderBy: (b, { asc }) => asc(b.divergeY),
  });

  return NextResponse.json({
    status: ws.branchesStatus ?? "idle",
    generatedAt: ws.branchesGeneratedAt,
    error: ws.branchesError,
    branches: allBranches,
  });
}
