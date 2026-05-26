import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import type { LLMProvider, LLMTextOptions, LLMStructuredOptions } from "../types";
import { LLMProviderError } from "../errors";
import { log } from "@/lib/log";

// gemini-2.5-flash is current stable as of 2025; Flash handles everything
const MODEL = "gemini-2.5-flash";

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini" as const;
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async text(prompt: string, options: LLMTextOptions = {}): Promise<string> {
    try {
      const result = await this.client.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          maxOutputTokens: options.maxTokens ?? 1024,
          ...(options.temperature !== undefined && { temperature: options.temperature }),
          safetySettings: SAFETY_SETTINGS,
        },
      });

      if (result.promptFeedback?.blockReason) {
        throw new LLMProviderError({
          kind: "safety",
          provider: this.name,
          message: `Gemini blocked the prompt: ${result.promptFeedback.blockReason}`,
        });
      }

      const text = result.text;
      if (!text) {
        throw new LLMProviderError({
          kind: "invalid_response",
          provider: this.name,
          message: "Gemini returned empty response",
        });
      }
      return text;
    } catch (err: unknown) {
      if (err instanceof LLMProviderError) throw err;
      throw translateGeminiError(err);
    }
  }

  async structured<T>(prompt: string, options: LLMStructuredOptions<T>): Promise<T> {
    const schemaDesc = options.schemaDescription
      ? `\n\nYour response must match this shape:\n${options.schemaDescription}`
      : "";

    const fullPrompt = `${prompt}${schemaDesc}\n\nReturn ONLY valid JSON matching the required shape.`;

    const attempt = async (extra = "") => {
      const result = await this.client.models.generateContent({
        model: MODEL,
        contents: fullPrompt + extra,
        config: {
          maxOutputTokens: options.maxTokens ?? 2048,
          ...(options.temperature !== undefined && { temperature: options.temperature }),
          responseMimeType: "application/json",
          safetySettings: SAFETY_SETTINGS,
        },
      });
      const text = result.text ?? "";
      // Strip fences in case Gemini wraps anyway
      const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
      return JSON.parse(cleaned);
    };

    let rawResult: unknown;
    try {
      rawResult = await attempt();
    } catch (err) {
      throw new LLMProviderError({
        kind: "invalid_response",
        provider: this.name,
        message: `Failed to parse JSON from Gemini: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    const validation = options.schema.safeParse(rawResult);

    if (!validation.success && options.retryOnInvalid) {
      log({ level: "warn", message: "llm.structured.retry", meta: { provider: this.name, errors: validation.error.issues } });
      const issues = validation.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n");
      try {
        rawResult = await attempt(`\n\nYour previous response failed validation:\n${issues}\n\nRegenerate, correcting these specific issues. Return only valid JSON.`);
      } catch (err) {
        throw new LLMProviderError({ kind: "invalid_response", provider: this.name, message: `Retry failed: ${err instanceof Error ? err.message : String(err)}` });
      }
      const revalidation = options.schema.safeParse(rawResult);
      if (!revalidation.success) {
        throw new LLMProviderError({ kind: "invalid_response", provider: this.name, message: `Gemini schema validation failed after retry: ${revalidation.error.message}` });
      }
      return revalidation.data;
    }

    if (!validation.success) {
      throw new LLMProviderError({ kind: "invalid_response", provider: this.name, message: `Schema validation failed: ${validation.error.message}` });
    }

    return validation.data;
  }
}

function translateGeminiError(err: unknown): LLMProviderError {
  const message = err instanceof Error ? err.message : String(err);
  if (/api[_ ]key|unauthorized|401/i.test(message)) return new LLMProviderError({ kind: "auth", provider: "gemini", message: "Invalid Gemini API key" });
  if (/rate[_ ]limit|quota|429/i.test(message)) return new LLMProviderError({ kind: "rate_limit", provider: "gemini", message: "Gemini rate limit exceeded", retryable: true });
  if (/safety|blocked|harm/i.test(message)) return new LLMProviderError({ kind: "safety", provider: "gemini", message: "Gemini blocked content for safety reasons" });
  return new LLMProviderError({ kind: "unknown", provider: "gemini", message });
}
