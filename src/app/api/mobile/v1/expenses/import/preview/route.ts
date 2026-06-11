import { NextResponse } from "next/server";
import { authenticateMobileRequest, getOrCreateMobileWorkspace } from "@/lib/auth/mobile";
import { parseWorkbook, detectExpenseColumnMapping, rowsToExpenseFacts } from "@/lib/import/expense-excel";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await authenticateMobileRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch {
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
    mapping = await detectExpenseColumnMapping(sheet);
  } catch (err) {
    console.error("[expense-import.preview] LLM column detection failed", err);
    mapping = { date: -1, amount: -1, category: -1, description: -1, counterparty: -1 };
  }

  // Surface data-quality flags at preview so the user sees bad rows BEFORE
  // confirming. Confirm re-runs the same validation server-side.
  const { facts, flagged } = rowsToExpenseFacts(sheet, mapping);

  return NextResponse.json({
    headers: sheet.headers,
    sampleRows: sheet.rows.slice(0, 8),
    rows: sheet.rows,
    mapping,
    totalRows: sheet.rows.length,
    usableRows: facts.length,
    flagged,
    flaggedCount: flagged.length,
  });
}
