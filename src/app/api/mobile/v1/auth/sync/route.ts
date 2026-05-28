import { NextResponse } from "next/server";
import { authenticateMobileRequest, getOrCreateMobileWorkspace } from "@/lib/auth/mobile";

/**
 * Called by the mobile app right after Supabase sign-in. Validates the JWT,
 * provisions the user + workspace on first call, and returns workspace context.
 */
export async function POST(req: Request) {
  const user = await authenticateMobileRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await getOrCreateMobileWorkspace(user);

  return NextResponse.json({
    workspace: {
      id: workspace.id,
      name: workspace.name,
      businessDescription: workspace.businessDescription,
    },
  });
}
