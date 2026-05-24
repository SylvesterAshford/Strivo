import { describe, it, expect } from "vitest";
import { extractText } from "../text";

describe("extractText", () => {
  it("returns trimmed string from buffer", () => {
    const buf = Buffer.from("  hello world  \n");
    expect(extractText(buf)).toBe("hello world");
  });

  it("handles utf-8 multi-byte characters", () => {
    const buf = Buffer.from("Société Générale — café", "utf-8");
    expect(extractText(buf)).toBe("Société Générale — café");
  });
});
