import { env } from "@/lib/env";
import type { LLMProvider } from "./types";
import { GeminiProvider } from "./providers/gemini";

let _provider: LLMProvider | null = null;

export function getLLM(): LLMProvider {
  if (_provider) return _provider;
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  _provider = new GeminiProvider(env.GEMINI_API_KEY);
  return _provider;
}

export type { LLMProvider, LLMTextOptions, LLMStructuredOptions, LLMError } from "./types";
export { LLMProviderError, isLLMError } from "./errors";
