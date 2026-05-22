import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { users, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createId } from "@/lib/id";

/**
 * Get the current user's workspace, creating it (and the user row) if needed.
 * Called from server components or actions that need workspace context.
 */
export async function getOrCreateWorkspace() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!existingUser) {
    const clerkUser = await currentUser();
    if (!clerkUser) throw new Error("Clerk user not found");
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) throw new Error("User has no email");

    await db.insert(users).values({
      id: userId,
      email,
    });
  }

  const existing = await db.query.workspaces.findFirst({
    where: eq(workspaces.ownerId, userId),
  });

  if (existing) return existing;

  const newWorkspace = {
    id: `ws_${createId()}`,
    ownerId: userId,
    name: "My workspace",
  };

  await db.insert(workspaces).values(newWorkspace);
  return newWorkspace;
}

export async function requireWorkspace() {
  return getOrCreateWorkspace();
}
