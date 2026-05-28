import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import type { LLMProvider, LLMTextOptions, LLMStructuredOptions } from "../types";
import { LLMProviderError } from "../errors";
import { log } from "@/lib/log";
import { env } from "@/lib/env";

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
    // When GEMINI_PROXY_URL is set, route every request through the Supabase
    // Edge Function instead of hitting Google directly. Lets the backend run
    // anywhere (including networks that can't reach generativelanguage.*).
    this.client = new GoogleGenAI({
      apiKey,
      ...(env.GEMINI_PROXY_URL && { httpOptions: { baseUrl: env.GEMINI_PROXY_URL } }),
    });
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
      // Retry transient upstream 5xx (e.g. "UNAVAILABLE high demand") up to 3
      // times with exponential backoff before bubbling up.
      rawResult = await withRetries(attempt, { tries: 3, baseMs: 800 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const retryable = isTransientUpstream(message);
      throw new LLMProviderError({
        kind: retryable ? "rate_limit" : "invalid_response",
        provider: this.name,
        message: retryable
          ? "Gemini is overloaded right now. Try again in a moment."
          : `Failed to parse JSON from Gemini: ${message}`,
        retryable,
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

/** Match Google's "model overloaded" 5xx and 429 rate-limit error messages. */
function isTransientUpstream(message: string): boolean {
  return /\b(503|502|504|UNAVAILABLE|RESOURCE_EXHAUSTED|429|rate.?limit|overload|high demand)\b/i.test(message);
}

async function withRetries<T>(
  fn: () => Promise<T>,
  { tries, baseMs }: { tries: number; baseMs: number }
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (!isTransientUpstream(msg)) throw err;
      if (i < tries - 1) {
        const delay = baseMs * Math.pow(2, i); // 800, 1600, 3200ms
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

function translateGeminiError(err: unknown): LLMProviderError {
  const message = err instanceof Error ? err.message : String(err);
  if (/api[_ ]key|unauthorized|401/i.test(message)) return new LLMProviderError({ kind: "auth", provider: "gemini", message: "Invalid Gemini API key" });
  if (/rate[_ ]limit|quota|429/i.test(message)) return new LLMProviderError({ kind: "rate_limit", provider: "gemini", message: "Gemini rate limit exceeded", retryable: true });
  if (/safety|blocked|harm/i.test(message)) return new LLMProviderError({ kind: "safety", provider: "gemini", message: "Gemini blocked content for safety reasons" });
  return new LLMProviderError({ kind: "unknown", provider: "gemini", message });
}
