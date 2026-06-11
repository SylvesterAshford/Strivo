import type { LLMError } from "./types";
import { captureError } from "@/lib/observability";

export class LLMProviderError extends Error implements LLMError {
  readonly kind: LLMError["kind"];
  readonly provider: string;
  readonly retryable: boolean;

  constructor(params: {
    kind: LLMError["kind"];
    provider: string;
    message: string;
    retryable?: boolean;
  }) {
    super(params.message);
    this.name = "LLMProviderError";
    this.kind = params.kind;
    this.provider = params.provider;
    this.retryable = params.retryable ?? false;
    // Single funnel for every getLLM() failure: constructed only after the
    // provider's retry budget is exhausted, so each instance is a real
    // user-visible failure. Several call sites swallow these (e.g. column
    // detection falls back to manual mapping) — capturing here keeps the
    // swallowed ones observable. Message carries no prompt content.
    captureError(this, { source: "llm", provider: params.provider, kind: params.kind });
  }
}

export function isLLMError(err: unknown): err is LLMError {
  return err instanceof Error && "kind" in err && "provider" in err;
}
