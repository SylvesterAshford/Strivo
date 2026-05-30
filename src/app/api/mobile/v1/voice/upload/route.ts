import { NextResponse } from "next/server";
import {
  authenticateMobileRequest,
  getOrCreateMobileWorkspace,
  withWorkspaceScope,
} from "@/lib/auth/mobile";
import { transcribeAudio } from "@/lib/transcription/gemini-audio";
import { extractFacts } from "@/lib/extraction/mobile-facts";
import { voiceRecordings } from "@/db/schema";
import { createId } from "@/lib/id";

// Max body: 20 MB (Gemini inline limit; 90-second voice ≈ 720 KB — well within)
export const maxDuration = 60; // Vercel function timeout in seconds

export async function POST(req: Request) {
  const user = await authenticateMobileRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const form = await req.formData();
  const audioFile = form.get("audio");
  const durationStr = form.get("durationSecs");

  if (!(audioFile instanceof File)) {
    return NextResponse.json({ error: "Missing audio field" }, { status: 400 });
  }

  const durationSecs = durationStr ? parseInt(String(durationStr), 10) : undefined;
  const mimeType = audioFile.type || "audio/mp4";
  const audioBytes = Buffer.from(await audioFile.arrayBuffer());

  const workspace = await getOrCreateMobileWorkspace(user);

  // Transcribe + extract outside any transaction — these are long LLM calls
  // and we don't want to hold a DB connection open.
  let transcript: string;
  try {
    transcript = await transcribeAudio(audioBytes, mimeType);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Transcription failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const draftFacts = await extractFacts(transcript);

  // Persist the recording inside a scoped transaction so RLS allows the insert.
  const recordingId = `vrec_${createId()}`;
  await withWorkspaceScope(workspace.id, async (tx) => {
    await tx.insert(voiceRecordings).values({
      id: recordingId,
      workspaceId: workspace.id,
      durationSecs: Number.isFinite(durationSecs) ? durationSecs : undefined,
      transcript,
      transcribedAt: new Date(),
    });
  });

  return NextResponse.json({ recordingId, transcript, facts: draftFacts });
}
