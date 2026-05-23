"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  businessDescription: z.string().max(1000).optional(),
});

export async function updateWorkspace(input: z.infer<typeof updateSchema>) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = updateSchema.parse(input);

  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.ownerId, userId),
  });
  if (!ws) throw new Error("Workspace not found");

  await db
    .update(workspaces)
    .set({ ...parsed, updatedAt: new Date() })
    .where(eq(workspaces.id, ws.id));

  revalidatePath("/");
}
