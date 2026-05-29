import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateMobileRequest, getOrCreateMobileWorkspace } from "@/lib/auth/mobile";
import { extractProductsFromText } from "@/lib/import/products";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  text: z.string().min(3).max(20_000),
});

export async function POST(req: Request) {
  const user = await authenticateMobileRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await getOrCreateMobileWorkspace(user);

  try {
    const products = await extractProductsFromText(parsed.data.text);
    return NextResponse.json({ products });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown extraction error";
    console.error("[products.import.text] extraction failed", err);
    return NextResponse.json({ error: `Extraction failed: ${message}` }, { status: 502 });
  }
}
