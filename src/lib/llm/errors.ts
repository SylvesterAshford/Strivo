import type { LLMError } from "./types";

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
  }
}

export function isLLMError(err: unknown): err is LLMError {
  return err instanceof Error && "kind" in err && "provider" in err;
}
