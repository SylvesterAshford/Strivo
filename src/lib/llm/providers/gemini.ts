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
    //
    // The Supabase edge gateway requires an Authorization header (anon key).
    // @google/genai's httpOptions.headers merges into every request — the
    // cleanest way to inject the Supabase JWT without a custom fetch.
    this.client = new GoogleGenAI({
      apiKey,
      ...(env.GEMINI_PROXY_URL && {
        httpOptions: {
          baseUrl: env.GEMINI_PROXY_URL,
          ...(env.SUPABASE_ANON_KEY && {
            headers: { authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
          }),
        },
      }),
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
      return parseLenientJson(cleaned);
    };

    let rawResult: unknown;
    try {
      // Retry transient upstream 5xx (e.g. "UNAVAILABLE high demand"). Capped
      // at 3 tries with short backoff (~400/800ms + jitter) so the WHOLE
      // request stays under the mobile client's ~60s iOS native timeout —
      // a longer retry budget caused "The request timed out" on the device.
      // The proxy already rotates keys per attempt, so 3 tries covers the
      // common transient blips without blowing the latency budget.
      rawResult = await withRetries(attempt, { tries: 3, baseMs: 400 });
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

/**
 * Parse JSON from Gemini, repairing the common glitches that make a raw
 * JSON.parse throw:
 *   - trailing commas before } or ]  (`{"a":1,}` → `{"a":1}`)
 *   - smart/curly quotes that Gemini sometimes emits in Burmese output
 *   - truncated output (response hit the token cap mid-array) — we close any
 *     open strings/brackets so the partial result still validates.
 * Falls back to throwing the original SyntaxError if repair fails, so the
 * retry-on-invalid path still kicks in.
 */
function parseLenientJson(raw: string): unknown {
  // Fast path — most responses are already valid.
  try {
    return JSON.parse(raw);
  } catch {
    // fall through to repair
  }

  let s = raw;

  // Normalise smart quotes to straight quotes.
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

  // Remove trailing commas before a closing brace/bracket.
  s = s.replace(/,(\s*[}\]])/g, "$1");

  try {
    return JSON.parse(s);
  } catch {
    // Likely truncated mid-output. Drop the incomplete trailing element, then
    // balance brackets. This recovers the rows Gemini DID finish emitting.
    return JSON.parse(closeTruncatedJson(s));
  }
}

/**
 * Best-effort repair of a JSON string cut off mid-output (Gemini hit the
 * maxOutputTokens cap). Strategy: cut back to the last fully-complete element
 * (the last top-level/nested closing `}` or `]`), then re-balance the bracket
 * stack so the partial array/object still parses. This keeps every row Gemini
 * finished and discards the half-written final one.
 */
function closeTruncatedJson(s: string): string {
  // Find the last position where a complete element closed (}, ], or a quoted
  // string / primitive). Cutting at the last closing brace of a nested object
  // is the common case for our `{ "facts": [ {...}, {...}, {...truncated`.
  const lastBrace = s.lastIndexOf("}");
  const lastBracket = s.lastIndexOf("]");
  const cut = Math.max(lastBrace, lastBracket);

  // If we never closed a single element, fall back to closing dangling string.
  let body = cut >= 0 ? s.slice(0, cut + 1) : s;

  // Re-scan the trimmed body to compute which brackets remain open.
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }

  if (inString) body += '"';
  body = body.replace(/,\s*$/, "");
  for (let i = stack.length - 1; i >= 0; i--) {
    body += stack[i] === "{" ? "}" : "]";
  }
  return body;
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
        // Exponential backoff + jitter so parallel callers don't all retry
        // at exactly the same moment (thundering herd on free-tier quotas).
        const jitter = Math.random() * 400;
        const delay = baseMs * Math.pow(2, i) + jitter; // ~800, ~1600, ~3200ms
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
