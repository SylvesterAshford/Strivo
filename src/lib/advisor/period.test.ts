import { describe, it, expect } from "vitest";
import { reviewedMonthFrom } from "./period";

describe("reviewedMonthFrom", () => {
  it("returns null when there is no data (no max date)", () => {
    expect(reviewedMonthFrom(null)).toBeNull();
  });

  it("resolves the MMT month + label from the latest fact date", () => {
    const r = reviewedMonthFrom(new Date("2026-06-07T22:00:00Z")); // 2026-06-08 04:30 MMT
    expect(r).not.toBeNull();
    expect(r!.periodMonth).toBe("2026-06");
    expect(r!.start.toISOString()).toBe("2026-05-31T17:30:00.000Z");
    expect(r!.end.toISOString()).toBe("2026-06-30T17:30:00.000Z");
  });

  it("buckets a late-MMT instant by wall-clock, not UTC", () => {
    // 2026-05-31T18:00:00Z = 2026-06-01 00:30 MMT → June, not May.
    expect(reviewedMonthFrom(new Date("2026-05-31T18:00:00Z"))!.periodMonth).toBe("2026-06");
    // 2026-05-31T17:00:00Z = 2026-05-31 23:30 MMT → still May.
    expect(reviewedMonthFrom(new Date("2026-05-31T17:00:00Z"))!.periodMonth).toBe("2026-05");
  });
});
