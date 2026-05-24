import { describe, it, expect } from "vitest";
import { findPassage } from "../find-passage";

describe("findPassage (legacy substring)", () => {
  const sample = "Daylight Labs announced today that it has partnered with Voicebox to expand into healthcare. The deal is worth $5M.";

  it("finds an exact name match", () => {
    const result = findPassage(sample, "Voicebox");
    expect(result).not.toBeNull();
    expect(result?.text).toContain("Voicebox");
  });

  it("returns null when the name is not in the text", () => {
    expect(findPassage(sample, "Pinterest")).toBeNull();
  });

  it("captures sentence-ish context around the match", () => {
    const result = findPassage(sample, "Voicebox");
    expect(result?.text.length).toBeGreaterThan("Voicebox".length);
  });
});
