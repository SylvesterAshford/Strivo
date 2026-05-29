import { NextResponse } from "next/server";
import { authenticateMobileRequest, getOrCreateMobileWorkspace } from "@/lib/auth/mobile";
import { extractProductsFromText, xlsxToText, pdfToText } from "@/lib/import/products";

export const runtime = "nodejs";
export const maxDuration = 300;

const XLSX_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);
const PDF_MIME = "application/pdf";

export async function POST(req: Request) {
  const user = await authenticateMobileRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateMobileWorkspace(user);

  let buffer: Buffer;
  let mime: string;
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
    mime = file.type;
  } catch {
    return NextResponse.json({ error: "Could not read upload" }, { status: 400 });
  }

  let text: string;
  try {
    if (XLSX_MIME.has(mime) || mime === "") {
      // Empty mime falls back to xlsx-parse — Excel is the more common upload
      // and xlsx will reject non-Excel cleanly.
      try {
        text = xlsxToText(buffer);
      } catch {
        // Fall through to PDF if xlsx parsing failed
        text = await pdfToText(buffer);
      }
    } else if (mime === PDF_MIME) {
      text = await pdfToText(buffer);
    } else {
      return NextResponse.json({ error: `Unsupported file type: ${mime}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Parse failed";
    return NextResponse.json({ error: `Parse failed: ${message}` }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Document contained no readable text" }, { status: 400 });
  }

  let products;
  try {
    products = await extractProductsFromText(text);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown extraction error";
    console.error("[products.import.file] extraction failed", err);
    return NextResponse.json({ error: `Extraction failed: ${message}` }, { status: 502 });
  }

  return NextResponse.json({ products });
}
