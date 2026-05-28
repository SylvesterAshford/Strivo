import { NextResponse } from "next/server";
import { authenticateMobileRequest, getOrCreateMobileWorkspace } from "@/lib/auth/mobile";
import { parseWorkbook, detectColumnMapping } from "@/lib/import/sales-excel";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await authenticateMobileRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Ensure workspace exists so subsequent confirm() has somewhere to write.
  await getOrCreateMobileWorkspace(user);

  let buffer: Buffer;
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing file field" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }
    buffer = Buffer.from(await file.arrayBuffer());
  } catch (err) {
    return NextResponse.json({ error: "Could not read upload" }, { status: 400 });
  }

  let sheet;
  try {
    sheet = parseWorkbook(buffer);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Parse failed" }, { status: 400 });
  }
  if (sheet.headers.length === 0 || sheet.rows.length === 0) {
    return NextResponse.json({ error: "Sheet is empty" }, { status: 400 });
  }

  let mapping;
  try {
    mapping = await detectColumnMapping(sheet);
  } catch (err) {
    console.error("[import.preview] LLM column detection failed", err);
    // Fall back to all -1 so the user can map manually.
    mapping = { date: -1, customer: -1, amount: -1, product: -1, quantity: -1 };
  }

  return NextResponse.json({
    headers: sheet.headers,
    // Cap returned rows so payload stays small; full rows come back on confirm.
    sampleRows: sheet.rows.slice(0, 8),
    rows: sheet.rows,
    mapping,
    totalRows: sheet.rows.length,
  });
}
