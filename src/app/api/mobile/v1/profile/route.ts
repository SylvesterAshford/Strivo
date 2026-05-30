import { NextResponse } from "next/server";
import { z } from "zod";
import { withMobileAuth } from "@/lib/auth/mobile";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

type SalesPeriod = "daily" | "weekly" | "monthly" | "yearly";
type RivalTier = "discount" | "matcher" | "premium";

function serialize(ws: {
  name: string;
  businessType: string | null;
  productService: string | null;
  location: string | null;
  monthlyTargetMmk: number | null;
  biggestChallenge: string | null;
  budgetMmk: number | null;
  competitors: string[] | null;
  posEnabled: boolean | null;
  salesPeriods: SalesPeriod[] | null;
  salesValues: Partial<Record<SalesPeriod, number>> | null;
  monthlyExpensesMmk: number | null;
  competitorDetails: { name: string; tier: RivalTier; audience: string }[] | null;
  customersSeed: string[] | null;
  productsSeed: { name: string; priceMmk?: number }[] | null;
  suppliersSeed: { name: string; supplies?: string }[] | null;
  expensesSeed: { category: string; monthlyMmk?: number }[] | null;
}) {
  return {
    businessName: ws.name,
    businessType: ws.businessType,
    productService: ws.productService,
    location: ws.location,
    monthlyTargetMmk: ws.monthlyTargetMmk,
    biggestChallenge: ws.biggestChallenge,
    budgetMmk: ws.budgetMmk,
    competitors: ws.competitors ?? [],
    posEnabled: ws.posEnabled,
    salesPeriods: ws.salesPeriods ?? [],
    salesValues: ws.salesValues ?? {},
    monthlyExpensesMmk: ws.monthlyExpensesMmk,
    expensesSeed: ws.expensesSeed ?? [],
    competitorDetails: ws.competitorDetails ?? [],
    customersSeed: ws.customersSeed ?? [],
    productsSeed: ws.productsSeed ?? [],
    suppliersSeed: ws.suppliersSeed ?? [],
  };
}

export async function GET(req: Request) {
  return withMobileAuth(req, async (_db, workspace) => {
    return NextResponse.json({ profile: serialize(workspace) });
  });
}

const SalesPeriodEnum = z.enum(["daily", "weekly", "monthly", "yearly"]);
const RivalTierEnum = z.enum(["discount", "matcher", "premium"]);

const ProfileBody = z.object({
  businessName: z.string().min(1).max(120).optional(),
  businessType: z.string().max(40).nullable().optional(),
  productService: z.string().max(200).nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  monthlyTargetMmk: z.number().int().min(0).nullable().optional(),
  biggestChallenge: z.string().max(300).nullable().optional(),
  budgetMmk: z.number().int().min(0).nullable().optional(),
  competitors: z.array(z.string().min(1).max(80)).max(10).optional(),
  posEnabled: z.boolean().nullable().optional(),
  salesPeriods: z.array(SalesPeriodEnum).max(4).optional(),
  // Use an explicit object so users who pick only one period (e.g. "daily")
  // don't fail "expected number, received undefined" on the other keys.
  salesValues: z
    .object({
      daily: z.number().int().min(0).optional(),
      weekly: z.number().int().min(0).optional(),
      monthly: z.number().int().min(0).optional(),
      yearly: z.number().int().min(0).optional(),
    })
    .optional(),
  monthlyExpensesMmk: z.number().int().min(0).nullable().optional(),
  competitorDetails: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        tier: RivalTierEnum,
        audience: z.string().max(120),
      })
    )
    .max(10)
    .optional(),
  customersSeed: z.array(z.string().min(1).max(80)).max(50).optional(),
  productsSeed: z
    .array(z.object({ name: z.string().min(1).max(80), priceMmk: z.number().int().min(0).optional() }))
    .max(50)
    .optional(),
  suppliersSeed: z
    .array(z.object({ name: z.string().min(1).max(80), supplies: z.string().max(120).optional() }))
    .max(30)
    .optional(),
  expensesSeed: z
    .array(z.object({ category: z.string().min(1).max(40), monthlyMmk: z.number().int().min(0).optional() }))
    .max(20)
    .optional(),
});

export async function PUT(req: Request) {
  const parsed = ProfileBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  return withMobileAuth(req, async (db, workspace) => {
    const b = parsed.data;

    const [updated] = await db
      .update(workspaces)
    .set({
      ...(b.businessName !== undefined && { name: b.businessName }),
      ...(b.businessType !== undefined && { businessType: b.businessType }),
      ...(b.productService !== undefined && { productService: b.productService }),
      ...(b.location !== undefined && { location: b.location }),
      ...(b.monthlyTargetMmk !== undefined && { monthlyTargetMmk: b.monthlyTargetMmk }),
      ...(b.biggestChallenge !== undefined && { biggestChallenge: b.biggestChallenge }),
      ...(b.budgetMmk !== undefined && { budgetMmk: b.budgetMmk }),
      ...(b.competitors !== undefined && { competitors: b.competitors }),
      ...(b.posEnabled !== undefined && { posEnabled: b.posEnabled }),
      ...(b.salesPeriods !== undefined && { salesPeriods: b.salesPeriods }),
      ...(b.salesValues !== undefined && { salesValues: b.salesValues }),
      ...(b.monthlyExpensesMmk !== undefined && { monthlyExpensesMmk: b.monthlyExpensesMmk }),
      ...(b.competitorDetails !== undefined && { competitorDetails: b.competitorDetails }),
      ...(b.customersSeed !== undefined && { customersSeed: b.customersSeed }),
      ...(b.productsSeed !== undefined && { productsSeed: b.productsSeed }),
      ...(b.suppliersSeed !== undefined && { suppliersSeed: b.suppliersSeed }),
      ...(b.expensesSeed !== undefined && { expensesSeed: b.expensesSeed }),
      updatedAt: new Date(),
    })
      .where(eq(workspaces.id, workspace.id))
      .returning();

    return NextResponse.json({ profile: serialize(updated) });
  });
}
