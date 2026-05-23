import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { materials } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireWorkspace } from "@/lib/workspace";
import { createId } from "@/lib/id";
import { contentHash } from "@/lib/content-hash";
import { extractPdf } from "@/lib/extract/pdf";
import { extractDocx } from "@/lib/extract/docx";
import { extractText } from "@/lib/extract/text";
import { log } from "@/lib/log";

const MAX_FILE_BYTES = 50 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await requireWorkspace();
  const formData = await req.formData();
  const kind = formData.get("kind");

  if (kind !== "file" && kind !== "text") {
    return NextResponse.json({ error: "Invalid upload kind" }, { status: 400 });
  }

  let title: string;
  let contentText: string;
  let storagePath: string | null = null;

  if (kind === "file") {
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File required" }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File exceeds 50MB limit" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

    if (ext === "pdf") {
      contentText = await extractPdf(buffer);
    } else if (ext === "docx") {
      contentText = await extractDocx(buffer);
    } else if (ext === "md" || ext === "txt") {
      contentText = extractText(buffer);
    } else {
      return NextResponse.json({ error: `Unsupported file type: .${ext}` }, { status: 400 });
    }

    // Vercel Blob upload skipped until BLOB_READ_WRITE_TOKEN is provisioned.
    title = file.name;
  } else {
    const pasted = formData.get("text");
    if (typeof pasted !== "string" || pasted.trim().length < 10) {
      return NextResponse.json({ error: "Pasted text too short" }, { status: 400 });
    }
    contentText = pasted.trim();
    const titleField = formData.get("title");
    title =
      typeof titleField === "string" && titleField.trim().length > 0
        ? titleField.trim()
        : `Pasted ${new Date().toLocaleString()}`;
  }

  if (contentText.length < 50) {
    return NextResponse.json({ error: "Extracted content too short" }, { status: 400 });
  }

  const hash = contentHash(contentText);

  const existing = await db.query.materials.findFirst({
    where: and(eq(materials.workspaceId, workspace.id), eq(materials.contentHash, hash)),
  });
  if (existing) {
    return NextResponse.json(
      { error: "This material has already been added to your workspace.", existingId: existing.id },
      { status: 409 },
    );
  }

  const contextNoteRaw = formData.get("contextNote");
  const contextNote = typeof contextNoteRaw === "string" ? contextNoteRaw.trim() : null;

  const materialId = `mat_${createId()}`;
  await db.insert(materials).values({
    id: materialId,
    workspaceId: workspace.id,
    kind: kind === "file" ? "file" : "text",
    title,
    sourceUrl: null,
    storagePath,
    contentText,
    contentHash: hash,
    contextNote,
    processingStatus: "pending",
  });

  log({
    level: "info",
    message: "material.created",
    workspaceId: workspace.id,
    userId,
    meta: { materialId, kind, title, textLength: contentText.length },
  });

  return NextResponse.json({ materialId });
}
