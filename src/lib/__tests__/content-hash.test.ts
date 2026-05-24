import { describe, it, expect } from "vitest";
import { contentHash } from "../content-hash";

describe("contentHash", () => {
  it("produces identical hashes for identical content", () => {
    expect(contentHash("hello world")).toBe(contentHash("hello world"));
  });

  it("normalizes whitespace before hashing", () => {
    expect(contentHash("hello world")).toBe(contentHash("  hello\n\n  world  "));
    expect(contentHash("hello world")).toBe(contentHash("hello\tworld"));
  });

  it("normalizes case", () => {
    expect(contentHash("Hello World")).toBe(contentHash("hello world"));
  });

  it("produces different hashes for different content", () => {
    expect(contentHash("hello world")).not.toBe(contentHash("hello worlds"));
  });

  it("returns a 64-character hex string (SHA-256)", () => {
    const h = contentHash("anything");
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });
});
