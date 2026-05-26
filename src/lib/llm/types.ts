import { z } from "zod";

export interface LLMTextOptions {
  maxTokens?: number;
  temperature?: number;
  workKind?: "fast" | "reasoning";
}

export interface LLMStructuredOptions<T> extends LLMTextOptions {
  schema: z.ZodSchema<T>;
  schemaDescription?: string;
  retryOnInvalid?: boolean;
}

export interface LLMProvider {
  readonly name: "anthropic" | "gemini";
  text(prompt: string, options?: LLMTextOptions): Promise<string>;
  structured<T>(prompt: string, options: LLMStructuredOptions<T>): Promise<T>;
}

export interface LLMError extends Error {
  readonly kind: "auth" | "rate_limit" | "billing" | "invalid_response" | "safety" | "timeout" | "unknown";
  readonly provider: string;
  readonly retryable: boolean;
}
