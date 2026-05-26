import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockStructured } = vi.hoisted(() => ({ mockStructured: vi.fn() }));

vi.mock("@/lib/llm", () => ({
  getLLM: () => ({ structured: mockStructured }),
}));

import { extractPassages } from "../llm-passages";

beforeEach(() => {
  mockStructured.mockReset();
});

describe("extractPassages", () => {
  it("returns empty array when entities list is empty", async () => {
    const result = await extractPassages({ text: "some text", entities: [] });
    expect(result).toEqual([]);
  });

  it("returns empty array when structured throws", async () => {
    mockStructured.mockRejectedValue(new Error("LLM error"));
    const result = await extractPassages({
      text: "Daylight Labs is great",
      entities: [{ id: "e1", name: "Daylight Labs" }],
    });
    expect(result).toEqual([]);
  });

  it("filters out entities not in the provided list", async () => {
    mockStructured.mockResolvedValue([
      { entityName: "Unknown Corp", passage: "...", start: 0, end: 3 },
    ]);
    const result = await extractPassages({
      text: "Daylight Labs is great",
      entities: [{ id: "e1", name: "Daylight Labs" }],
    });
    expect(result).toEqual([]);
  });

  it("maps entity names case-insensitively back to IDs", async () => {
    mockStructured.mockResolvedValue([
      { entityName: "daylight labs", passage: "Daylight Labs is great", start: 0, end: 22 },
    ]);
    const result = await extractPassages({
      text: "Daylight Labs is great",
      entities: [{ id: "e1", name: "Daylight Labs" }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].entityId).toBe("e1");
  });
});
