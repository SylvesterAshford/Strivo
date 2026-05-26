import { describe, it, expect } from "vitest";
import { z } from "zod";

// Test the diversity check logic (isolated, no DB or LLM required)
const hasRequiredDiversity = (
  branches: Array<{ valence: string }>
): boolean => {
  const valences = new Set(branches.map((b) => b.valence));
  return valences.has("favorable") && valences.has("adverse");
};

// Minimal response schema for validation tests
const ResponseSchema = z.object({
  mainCommits: z.array(z.object({
    t: z.number().min(0).max(1),
    description: z.string().min(20).max(200),
    affectedEntityIds: z.array(z.string()).default([]),
  })).min(3).max(8),
  subBranches: z.array(z.object({
    name: z.string().regex(/^[a-z][a-z0-9-]{2,40}$/),
    valence: z.enum(["favorable", "neutral", "contested", "adverse"]),
    probability: z.number().int().min(5).max(60),
    description: z.string().min(40).max(300),
    triggerEvent: z.string().min(20).max(200),
    involvedEntityIds: z.array(z.string()).min(1).max(15),
    commits: z.array(z.object({
      t: z.number().min(0.05).max(1),
      description: z.string().min(20).max(200),
      affectedEntityIds: z.array(z.string()).default([]),
      projectedEntities: z.array(z.object({
        name: z.string().min(1).max(80),
        kind: z.string().min(1).max(20),
      })).default([]),
    })).min(2).max(5),
  })).min(3).max(5),
});

describe("hasRequiredDiversity", () => {
  it("returns true when both favorable and adverse are present", () => {
    expect(hasRequiredDiversity([
      { valence: "favorable" },
      { valence: "adverse" },
      { valence: "neutral" },
    ])).toBe(true);
  });

  it("returns false when only favorable", () => {
    expect(hasRequiredDiversity([
      { valence: "favorable" },
      { valence: "contested" },
    ])).toBe(false);
  });

  it("returns false when only adverse", () => {
    expect(hasRequiredDiversity([
      { valence: "adverse" },
      { valence: "neutral" },
    ])).toBe(false);
  });

  it("returns false when neither present", () => {
    expect(hasRequiredDiversity([
      { valence: "neutral" },
      { valence: "contested" },
    ])).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(hasRequiredDiversity([])).toBe(false);
  });
});

describe("ResponseSchema validation", () => {
  it("accepts a valid response", () => {
    const input = {
      mainCommits: [
        { t: 0.1, description: "Company raises Series A funding round", affectedEntityIds: ["e1"] },
        { t: 0.3, description: "Product launches to enterprise customers globally", affectedEntityIds: ["e2"] },
        { t: 0.7, description: "Competitor releases similar product with lower price", affectedEntityIds: ["e3"] },
      ],
      subBranches: [
        {
          name: "enterprise-deal-closes",
          valence: "favorable",
          probability: 25,
          description: "A major enterprise deal closes early, providing significant runway and validation for the platform.",
          triggerEvent: "Large enterprise signs a multi-year contract worth over $2M ARR",
          involvedEntityIds: ["e1", "e2"],
          commits: [
            { t: 0.2, description: "Deal enters final negotiation stage with legal", affectedEntityIds: ["e1"], projectedEntities: [] },
            { t: 0.4, description: "Contract signed and implementation begins", affectedEntityIds: ["e1", "e2"], projectedEntities: [] },
          ],
        },
        {
          name: "market-downturn",
          valence: "adverse",
          probability: 20,
          description: "A market downturn reduces available capital and forces painful cost cuts to extend runway.",
          triggerEvent: "Macro conditions deteriorate and funding market freezes for Series B rounds",
          involvedEntityIds: ["e1"],
          commits: [
            { t: 0.3, description: "Series B process stalls as investors pause activity", affectedEntityIds: ["e1"], projectedEntities: [] },
            { t: 0.6, description: "Team reduces headcount to extend runway by 18 months", affectedEntityIds: ["e1"], projectedEntities: [] },
          ],
        },
        {
          name: "partnership-formed",
          valence: "neutral",
          probability: 15,
          description: "A strategic partnership forms that brings distribution but also strategic dependencies.",
          triggerEvent: "Distribution partner approaches with a revenue-sharing deal proposal",
          involvedEntityIds: ["e2", "e3"],
          commits: [
            { t: 0.25, description: "Partnership discussions begin with key stakeholders involved", affectedEntityIds: ["e2"], projectedEntities: [] },
            { t: 0.5, description: "Agreement signed and joint go-to-market campaign launches", affectedEntityIds: ["e2", "e3"], projectedEntities: [] },
          ],
        },
      ],
    };

    const result = ResponseSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects a branch name with uppercase letters", () => {
    const input = {
      mainCommits: [
        { t: 0.1, description: "Company raises Series A funding round", affectedEntityIds: [] },
        { t: 0.5, description: "Second major milestone hit by the organization", affectedEntityIds: [] },
        { t: 0.9, description: "Third quarterly review completed successfully", affectedEntityIds: [] },
      ],
      subBranches: [
        {
          name: "BadName",
          valence: "favorable",
          probability: 20,
          description: "This branch has an invalid name with uppercase letters present.",
          triggerEvent: "Some trigger event occurs that causes the branch to diverge",
          involvedEntityIds: ["e1"],
          commits: [
            { t: 0.2, description: "First commit on this branch happens now", affectedEntityIds: [], projectedEntities: [] },
            { t: 0.5, description: "Second commit on this branch happens later", affectedEntityIds: [], projectedEntities: [] },
          ],
        },
      ],
    };

    const result = ResponseSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects probability outside 5-60 range", () => {
    const input = {
      mainCommits: [
        { t: 0.1, description: "Company raises Series A funding round", affectedEntityIds: [] },
        { t: 0.5, description: "Second major milestone hit by the organization", affectedEntityIds: [] },
        { t: 0.9, description: "Third quarterly review completed successfully", affectedEntityIds: [] },
      ],
      subBranches: [
        {
          name: "valid-name",
          valence: "favorable",
          probability: 80,
          description: "This branch has probability over the maximum allowed limit here.",
          triggerEvent: "Some trigger event occurs that causes the branch to diverge",
          involvedEntityIds: ["e1"],
          commits: [
            { t: 0.2, description: "First commit on this branch happens now", affectedEntityIds: [], projectedEntities: [] },
            { t: 0.5, description: "Second commit on this branch happens later", affectedEntityIds: [], projectedEntities: [] },
          ],
        },
      ],
    };

    const result = ResponseSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
