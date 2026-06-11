import { describe, it, expect } from "vitest";
import { applyCountAwareDedupe, dedupeKey, type DedupableRow } from "./batches";

// Count-aware (multiset) dedupe is what makes re-uploading an updated ledger
// idempotent WITHOUT silently dropping genuine same-day duplicates.

const row = (over: Partial<DedupableRow> = {}): DedupableRow => ({
  kind: "sale",
  amountMmk: 2000,
  description: "လက်ဖက်ရည်",
  counterparty: null,
  occurredAt: new Date("2026-05-03T08:30:00Z"),
  ...over,
});

const counts = (rows: DedupableRow[]): Map<string, number> => {
  const m = new Map<string, number>();
  for (const r of rows) m.set(dedupeKey(r), (m.get(dedupeKey(r)) ?? 0) + 1);
  return m;
};

describe("applyCountAwareDedupe", () => {
  it("re-uploading the identical file inserts nothing", () => {
    const file = [row(), row({ amountMmk: 5000 })];
    const { keep, skipped } = applyCountAwareDedupe(file, counts(file));
    expect(keep).toHaveLength(0);
    expect(skipped).toBe(2);
  });

  it("an updated file only lands the delta", () => {
    const old = [row()];
    const updated = [row(), row({ amountMmk: 9000, description: "ထမင်း" })];
    const { keep, skipped } = applyCountAwareDedupe(updated, counts(old));
    expect(keep).toHaveLength(1);
    expect(keep[0].amountMmk).toBe(9000);
    expect(skipped).toBe(1);
  });

  it("multiset: file has 3 identical rows, DB has 2 → insert exactly 1", () => {
    const db = [row(), row()];
    const file = [row(), row(), row()];
    const { keep, skipped } = applyCountAwareDedupe(file, counts(db));
    expect(keep).toHaveLength(1);
    expect(skipped).toBe(2);
  });

  it("two genuine same-day duplicates in a fresh file both survive", () => {
    const file = [row(), row()];
    const { keep, skipped } = applyCountAwareDedupe(file, new Map());
    expect(keep).toHaveLength(2);
    expect(skipped).toBe(0);
  });

  it("different time on the same DAY still matches (date-granular key)", () => {
    const db = [row({ occurredAt: new Date("2026-05-03T02:00:00Z") })];
    const file = [row({ occurredAt: new Date("2026-05-03T15:00:00Z") })];
    const { keep, skipped } = applyCountAwareDedupe(file, counts(db));
    expect(keep).toHaveLength(0);
    expect(skipped).toBe(1);
  });

  it("same amount+day but different description does NOT collide", () => {
    const db = [row({ description: "Phone x2" })];
    const file = [row({ description: "Tablet x1" })];
    const { keep } = applyCountAwareDedupe(file, counts(db));
    expect(keep).toHaveLength(1);
  });

  it("counterparty matching is trim/case-insensitive", () => {
    const db = [row({ counterparty: " KoNaing " })];
    const file = [row({ counterparty: "konaing" })];
    const { skipped } = applyCountAwareDedupe(file, counts(db));
    expect(skipped).toBe(1);
  });
});
