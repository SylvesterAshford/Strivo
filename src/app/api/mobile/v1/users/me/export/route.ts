import { NextResponse } from "next/server";
import { withMobileAuth } from "@/lib/auth/mobile";
import { facts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * Dump everything tied to the authenticated user: workspace profile + all
 * facts. Returned as a downloadable JSON file.
 */
export async function GET(req: Request) {
  return withMobileAuth(req, async (db, workspace, user) => {
    const factRows = await db
      .select()
      .from(facts)
      .where(eq(facts.workspaceId, workspace.id))
      .orderBy(desc(facts.occurredAt));

    const payload = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email ?? null,
        createdAt: user.created_at,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        businessDescription: workspace.businessDescription,
        businessType: workspace.businessType,
        productService: workspace.productService,
        location: workspace.location,
        monthlyTargetMmk: workspace.monthlyTargetMmk,
        biggestChallenge: workspace.biggestChallenge,
        budgetMmk: workspace.budgetMmk,
        posEnabled: workspace.posEnabled,
        salesPeriods: workspace.salesPeriods,
        salesValues: workspace.salesValues,
        monthlyExpensesMmk: workspace.monthlyExpensesMmk,
        competitors: workspace.competitors,
        competitorDetails: workspace.competitorDetails,
        customersSeed: workspace.customersSeed,
        productsSeed: workspace.productsSeed,
        suppliersSeed: workspace.suppliersSeed,
        insightsJson: workspace.insightsJson,
        insightsGeneratedAt: workspace.insightsGeneratedAt,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      },
      facts: factRows,
    };

    const date = new Date().toISOString().slice(0, 10);
    const headers = new Headers({
      "content-type": "application/json",
      "content-disposition": `attachment; filename="strivo-export-${date}.json"`,
    });

    return new NextResponse(JSON.stringify(payload, null, 2), { status: 200, headers });
  });
}
