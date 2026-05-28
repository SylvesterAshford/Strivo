import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { env } from "@/lib/env";

// Gemini 2.5 Flash natively understands audio — no Whisper needed.
// Max inline audio: 20 MB. Voice memos ≤ 90 s @ 64 kbps AAC ≈ 720 KB — safe.
const MODEL = "gemini-2.5-flash";

const SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const SYSTEM = `You are transcribing a Burmese (Myanmar) voice memo from an MSME business owner.
Transcribe the audio exactly as spoken. Keep all Burmese text in Myanmar script.
Do not translate. Do not add punctuation not present in the speech.
If the audio contains a mix of Burmese and English (common for business terms), preserve both.
Return only the raw transcript text with no preamble.`;

export async function transcribeAudio(
  audioBytes: Buffer,
  mimeType: string
): Promise<string> {
  const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

  const result = await client.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: audioBytes.toString("base64"),
            },
          },
          { text: SYSTEM },
        ],
      },
    ],
    config: {
      maxOutputTokens: 2048,
      temperature: 0,
      safetySettings: SAFETY,
    },
  });

  const text = result.text?.trim();
  if (!text) throw new Error("Gemini returned empty transcript");
  return text;
}
