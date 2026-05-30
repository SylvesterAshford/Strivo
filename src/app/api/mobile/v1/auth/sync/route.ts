import { NextResponse } from "next/server";
import { authenticateMobileRequest, getOrCreateMobileWorkspace } from "@/lib/auth/mobile";

/**
 * Called by the mobile app right after Supabase sign-in. Validates the JWT,
 * provisions the user + workspace on first call, and returns workspace context.
 *
 * `onboarded` tells the client whether this workspace already finished the
 * setup wizard, so a returning (or seeded) user skips straight to the app
 * instead of being forced back through onboarding. We treat a workspace as
 * onboarded once it has any of the core profile fields the wizard collects.
 */
export async function POST(req: Request) {
  const user = await authenticateMobileRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await getOrCreateMobileWorkspace(user);

  const onboarded = Boolean(
    workspace.businessType ||
      workspace.productService ||
      (workspace.salesValues && Object.keys(workspace.salesValues).length > 0) ||
      workspace.monthlyExpensesMmk != null
  );

  return NextResponse.json({
    workspace: {
      id: workspace.id,
      name: workspace.name,
      businessDescription: workspace.businessDescription,
      businessType: workspace.businessType,
      onboarded,
    },
  });
}
