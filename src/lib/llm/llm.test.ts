import { describe, it, expect } from "vitest";
import { LLMProviderError, isLLMError } from "./errors";

describe("LLMProviderError", () => {
  it("identifies LLM errors", () => {
    const err = new LLMProviderError({ kind: "billing", provider: "anthropic", message: "out of credits" });
    expect(isLLMError(err)).toBe(true);
  });

  it("does not identify generic errors", () => {
    expect(isLLMError(new Error("generic"))).toBe(false);
  });

  it("preserves retryable flag", () => {
    const err = new LLMProviderError({ kind: "rate_limit", provider: "gemini", message: "rate limit", retryable: true });
    expect(err.retryable).toBe(true);
  });

  it("defaults retryable to false", () => {
    const err = new LLMProviderError({ kind: "auth", provider: "anthropic", message: "invalid key" });
    expect(err.retryable).toBe(false);
  });

  it("preserves kind and provider", () => {
    const err = new LLMProviderError({ kind: "safety", provider: "gemini", message: "blocked" });
    expect(err.kind).toBe("safety");
    expect(err.provider).toBe("gemini");
  });

  it("has correct name", () => {
    const err = new LLMProviderError({ kind: "timeout", provider: "anthropic", message: "timed out" });
    expect(err.name).toBe("LLMProviderError");
  });

  it("is an instance of Error", () => {
    const err = new LLMProviderError({ kind: "unknown", provider: "gemini", message: "something went wrong" });
    expect(err instanceof Error).toBe(true);
  });
});
