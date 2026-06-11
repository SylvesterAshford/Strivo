import { describe, it, expect } from "vitest";
import {
  buildAdvisor,
  confidenceOf,
  monthBounds,
  priorMonthBounds,
  ym,
  type AdvisorInput,
} from "./monthly";

function input(over: Partial<AdvisorInput> = {}): AdvisorInput {
  return {
    thisMonth: { salesMmk: 1_000_000, expensesMmk: 600_000 },
    lastMonth: { salesMmk: 900_000, expensesMmk: 600_000 },
    outstandingMmk: 0,
    topExpenseCategory: null,
    dataThrough: "2026-05-31T00:00:00.000Z",
    periodMonth: "2026-05",
    txCount: 20,
    ...over,
  };
}

describe("month-window helpers (Myanmar time, UTC+6:30)", () => {
  // MMT month start = MMT-midnight on the 1st = UTC midnight 1st minus 6:30h
  // = the prior day at 17:30:00 UTC.
  it("monthBounds spans the containing MMT month", () => {
    const b = monthBounds(new Date("2026-05-15T10:00:00Z"));
    expect(b.start.toISOString()).toBe("2026-04-30T17:30:00.000Z");
    expect(b.end.toISOString()).toBe("2026-05-31T17:30:00.000Z");
  });
  it("priorMonthBounds returns the previous MMT month", () => {
    const prev = priorMonthBounds(monthBounds(new Date("2026-05-15T10:00:00Z")));
    expect(prev.start.toISOString()).toBe("2026-03-31T17:30:00.000Z");
    expect(prev.end.toISOString()).toBe("2026-04-30T17:30:00.000Z");
  });
  it("priorMonthBounds handles the Dec→Jan year boundary", () => {
    const prev = priorMonthBounds(monthBounds(new Date("2026-01-10T00:00:00Z")));
    expect(prev.start.toISOString()).toBe("2025-11-30T17:30:00.000Z");
    expect(prev.end.toISOString()).toBe("2025-12-31T17:30:00.000Z");
  });
  // CRITICAL regression: the UTC→MMT switch must bucket instants near month-end
  // by MMT wall-clock, not UTC. A sale at 2026-05-31 23:30 MMT is still May;
  // 30 minutes later (Jun 1 00:30 MMT) it is June.
  it("buckets a late-night MMT instant just before month-end into the same month", () => {
    // 2026-05-31T17:00:00Z = 2026-05-31 23:30 MMT → May
    expect(ym(new Date("2026-05-31T17:00:00Z"))).toBe("2026-05");
    expect(monthBounds(new Date("2026-05-31T17:00:00Z")).end.toISOString()).toBe(
      "2026-05-31T17:30:00.000Z",
    );
  });
  it("rolls an instant just after MMT month-end into the next month", () => {
    // 2026-05-31T18:00:00Z = 2026-06-01 00:30 MMT → June
    expect(ym(new Date("2026-05-31T18:00:00Z"))).toBe("2026-06");
    const b = monthBounds(new Date("2026-05-31T18:00:00Z"));
    expect(b.start.toISOString()).toBe("2026-05-31T17:30:00.000Z");
    expect(b.end.toISOString()).toBe("2026-06-30T17:30:00.000Z");
  });
  it("ym formats YYYY-MM in MMT", () => {
    expect(ym(new Date("2026-05-09T00:00:00Z"))).toBe("2026-05");
    expect(ym(new Date("2026-12-31T00:00:00Z"))).toBe("2026-12");
  });
});

describe("confidence", () => {
  it("insufficient under 3 transactions", () => {
    expect(confidenceOf(input({ txCount: 2 }))).toBe("insufficient");
  });
  it("insufficient when no sales even with transactions", () => {
    expect(confidenceOf(input({ txCount: 12, thisMonth: { salesMmk: 0, expensesMmk: 50_000 } }))).toBe("insufficient");
  });
  it("partial between 3 and 9 transactions", () => {
    expect(confidenceOf(input({ txCount: 5 }))).toBe("partial");
  });
  it("enough at 10+ transactions with sales", () => {
    expect(confidenceOf(input({ txCount: 10 }))).toBe("enough");
  });
});

describe("health status", () => {
  it("good when profitable, growing, enough data", () => {
    expect(buildAdvisor(input()).health.status).toBe("good");
  });
  it("at_risk on a loss", () => {
    const a = buildAdvisor(input({ thisMonth: { salesMmk: 400_000, expensesMmk: 700_000 } }));
    expect(a.health.status).toBe("at_risk");
    expect(a.snapshot.profitMmk).toBe(-300_000);
  });
  it("watch when profitable but expenses are high", () => {
    // profit positive (+10) but ratio > 70% (-15), flat sales, enough → 65 = watch
    const a = buildAdvisor(input({ thisMonth: { salesMmk: 1_000_000, expensesMmk: 800_000 }, lastMonth: { salesMmk: 1_000_000, expensesMmk: 800_000 } }));
    expect(a.health.status).toBe("watch");
  });
});

describe("diagnosis", () => {
  it("is null when confidence is insufficient", () => {
    expect(buildAdvisor(input({ txCount: 1 })).diagnosis).toBeNull();
  });
  it("says first month when there is no prior month", () => {
    const a = buildAdvisor(input({ lastMonth: null }));
    expect(a.diagnosis?.title).toBe("ပထမဦးဆုံး လ");
  });
  it("attributes a profit rise to higher sales", () => {
    const a = buildAdvisor(input({ thisMonth: { salesMmk: 1_200_000, expensesMmk: 600_000 }, lastMonth: { salesMmk: 900_000, expensesMmk: 600_000 } }));
    expect(a.diagnosis?.explanation).toContain("ရောင်းအား တိုးလာ");
  });
  it("attributes a profit fall to higher expenses", () => {
    const a = buildAdvisor(input({ thisMonth: { salesMmk: 900_000, expensesMmk: 850_000 }, lastMonth: { salesMmk: 900_000, expensesMmk: 600_000 } }));
    expect(a.diagnosis?.explanation).toContain("ကုန်ကျ များလာ");
  });
});

describe("alerts", () => {
  it("flags a high expense ratio and outstanding money, capped at 2", () => {
    const a = buildAdvisor(input({ thisMonth: { salesMmk: 1_000_000, expensesMmk: 800_000 }, outstandingMmk: 80_000 }));
    expect(a.alerts.length).toBe(2);
    expect(a.alerts.some((x) => x.severity === "warning")).toBe(true);
    expect(a.alerts.some((x) => x.severity === "info")).toBe(true);
  });
  it("has no alerts for a healthy month with no receivables", () => {
    expect(buildAdvisor(input()).alerts).toHaveLength(0);
  });
});

describe("actions", () => {
  it("recommends reviewing expenses (keyed) when the ratio is high", () => {
    const a = buildAdvisor(input({ thisMonth: { salesMmk: 1_000_000, expensesMmk: 800_000 }, topExpenseCategory: "ဆိုင်ခ" }));
    const keys = a.actions.map((x) => x.key);
    expect(keys).toContain("review_top_expense");
  });
  it("recommends follow-up when money is owed", () => {
    const a = buildAdvisor(input({ outstandingMmk: 50_000 }));
    expect(a.actions.map((x) => x.key)).toContain("follow_up_receivables");
  });
  it("recommends recording more when confidence is low", () => {
    const a = buildAdvisor(input({ txCount: 4 }));
    expect(a.actions.map((x) => x.key)).toContain("record_more");
  });
  it("falls back to keep_recording for a stable month, never more than 3, priority-ordered", () => {
    const a = buildAdvisor(input());
    expect(a.actions.map((x) => x.key)).toEqual(["keep_recording"]);
    const high = buildAdvisor(input({ thisMonth: { salesMmk: 1_000_000, expensesMmk: 900_000 }, outstandingMmk: 10_000, txCount: 4 }));
    expect(high.actions.length).toBeLessThanOrEqual(3);
    expect(high.actions[0].priority).toBe("high");
  });
});
