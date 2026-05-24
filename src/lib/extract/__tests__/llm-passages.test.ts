import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
    constructor(_opts: unknown) {}
  },
}));

vi.mock("@/lib/env", () => ({
  env: { ANTHROPIC_API_KEY: "test-key" },
}));

import { extractPassages } from "../llm-passages";

beforeEach(() => {
  mockCreate.mockReset();
});

describe("extractPassages", () => {
  it("returns empty array when entities list is empty", async () => {
    const result = await extractPassages({ text: "some text", entities: [] });
    expect(result).toEqual([]);
  });

  it("returns empty array when model returns malformed JSON", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "not json at all" }] });
    const result = await extractPassages({
      text: "Daylight Labs is great",
      entities: [{ id: "e1", name: "Daylight Labs" }],
    });
    expect(result).toEqual([]);
  });

  it("returns empty array when model response has no JSON array", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: '{"entityName":"Daylight","passage":"x","start":0,"end":1}' }],
    });
    const result = await extractPassages({
      text: "Daylight Labs is great",
      entities: [{ id: "e1", name: "Daylight Labs" }],
    });
    expect(result).toEqual([]);
  });

  it("filters out entities not in the provided list", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify([{ entityName: "Unknown Corp", passage: "...", start: 0, end: 3 }]),
        },
      ],
    });
    const result = await extractPassages({
      text: "Daylight Labs is great",
      entities: [{ id: "e1", name: "Daylight Labs" }],
    });
    expect(result).toEqual([]);
  });

  it("maps entity names case-insensitively back to IDs", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify([
            { entityName: "daylight labs", passage: "Daylight Labs is great", start: 0, end: 22 },
          ]),
        },
      ],
    });
    const result = await extractPassages({
      text: "Daylight Labs is great",
      entities: [{ id: "e1", name: "Daylight Labs" }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].entityId).toBe("e1");
  });
});
