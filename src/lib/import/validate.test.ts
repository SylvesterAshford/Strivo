import { describe, it, expect } from "vitest";
import { parseAmountStrict, parseDateStrict, toAsciiDigits } from "./validate";
import { rowsToFacts, type ColumnMapping } from "./sales-excel";
import { MAX_PLAUSIBLE_MMK } from "./constants";

// Flag-don't-default: the 2026-06-10 prod incident landed a sale dated
// 2000-12-31 because a garbage date cell fell through lenient parsing.

describe("parseDateStrict", () => {
  it("accepts ISO dates inside the window", () => {
    expect(parseDateStrict("2026-06-01")?.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(parseDateStrict("2026-06-01T08:30:00Z")).not.toBeNull();
  });

  it("accepts DD/MM/YYYY, DD-MM-YYYY, DD.MM.YY (Myanmar day-first)", () => {
    expect(parseDateStrict("01/06/2026")?.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(parseDateStrict("01-06-2026")?.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(parseDateStrict("01.06.26")?.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("swaps to M/D only when day-first is impossible", () => {
    // 06/25 → 6 can't be a day-first day? It can — but 25 can't be a month,
    // so this must be June 25th.
    expect(parseDateStrict("06/25/2026")?.toISOString()).toBe("2026-06-25T00:00:00.000Z");
  });

  it("rejects the year-2000 regression and other out-of-window dates", () => {
    expect(parseDateStrict("2000-12-31")).toBeNull(); // the prod incident
    expect(parseDateStrict("31/12/00")).toBeNull();
    expect(parseDateStrict(new Date("2000-12-31"))).toBeNull(); // Date instance too
    expect(parseDateStrict("2099-01-01")).toBeNull(); // far future
  });

  it("rejects garbage, blanks, and impossible dates", () => {
    expect(parseDateStrict("not a date")).toBeNull();
    expect(parseDateStrict("")).toBeNull();
    expect(parseDateStrict(null)).toBeNull();
    expect(parseDateStrict("31/02/2026")).toBeNull(); // Feb 31 fails round-trip
    expect(parseDateStrict("13/13/2026")).toBeNull(); // neither can be a month
  });

  it("reads Burmese-numeral dates", () => {
    expect(parseDateStrict("၀၁/၀၆/၂၀၂၆")?.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });
});

describe("parseAmountStrict", () => {
  it("accepts plain and formatted positive amounts", () => {
    expect(parseAmountStrict(2500)).toBe(2500);
    expect(parseAmountStrict("2,500 Ks")).toBe(2500);
  });

  it("transliterates Burmese numerals (၁၂၃ → 123)", () => {
    expect(toAsciiDigits("၁၂၃")).toBe("123");
    expect(parseAmountStrict("၁၂၃")).toBe(123);
  });

  it("rejects zero, negative, absurd, and garbage amounts", () => {
    expect(parseAmountStrict(0)).toBeNull();
    expect(parseAmountStrict(-500)).toBeNull();
    expect(parseAmountStrict(MAX_PLAUSIBLE_MMK + 1)).toBeNull();
    expect(parseAmountStrict("free")).toBeNull();
    expect(parseAmountStrict("")).toBeNull();
    expect(parseAmountStrict(null)).toBeNull();
  });
});

describe("rowsToFacts flagging", () => {
  const mapping: ColumnMapping = { date: 0, customer: 1, amount: 2, product: -1, quantity: -1 };
  const sheet = (rows: (string | number | null)[][]) => ({ headers: ["Date", "Cust", "Amt"], rows });

  it("flags bad dates instead of defaulting them — never inserts", () => {
    const { facts, flagged } = rowsToFacts(
      sheet([
        ["2026-06-01", "KoNaing", 10_000],
        ["31/12/00", "MaPhyu", 5_000], // the year-2000 cell
      ]),
      mapping
    );
    expect(facts).toHaveLength(1);
    expect(flagged).toEqual([{ rowIndex: 1, reason: "bad_date", rawValue: "31/12/00" }]);
  });

  it("flags bad and missing amounts separately", () => {
    const { facts, flagged } = rowsToFacts(
      sheet([
        ["2026-06-01", "", "lots"], // unparseable
        ["2026-06-02", "", null], // missing
        ["2026-06-03", "", 2_000], // fine
      ]),
      mapping
    );
    expect(facts).toHaveLength(1);
    expect(flagged.map((f) => f.reason)).toEqual(["bad_amount", "missing_amount"]);
  });

  it("skips fully blank rows silently (no flag)", () => {
    const { facts, flagged } = rowsToFacts(sheet([[null, null, null]]), mapping);
    expect(facts).toHaveLength(0);
    expect(flagged).toHaveLength(0);
  });

  it("imposes no rules for undetected columns (manual-mapping fallback)", () => {
    const noAmountCol: ColumnMapping = { date: 0, customer: 1, amount: -1, product: -1, quantity: -1 };
    const { facts, flagged } = rowsToFacts(sheet([["2026-06-01", "KoNaing", null]]), noAmountCol);
    expect(facts).toHaveLength(1);
    expect(facts[0].amountMmk).toBeNull();
    expect(flagged).toHaveLength(0);
  });

  it("captures structured product fields when columns are mapped", () => {
    const withProduct: ColumnMapping = { date: 0, customer: -1, amount: 1, product: 2, quantity: 3 };
    const { facts } = rowsToFacts(
      { headers: ["Date", "Amt", "Product", "Qty"], rows: [["2026-06-01", 30_000, "လက်ဖက်ရည်", "၃"]] },
      withProduct
    );
    expect(facts).toHaveLength(1);
    expect(facts[0].productName).toBe("လက်ဖက်ရည်");
    expect(facts[0].quantity).toBe(3); // Burmese numeral ၃ transliterated
    expect(facts[0].unitPriceMmk).toBe(10_000); // 30,000 / 3
    expect(facts[0].description).toBe("လက်ဖက်ရည် × ၃");
  });

  it("leaves product fields null when columns are absent or junk", () => {
    const { facts } = rowsToFacts(
      { headers: ["Date", "Amt", "Product", "Qty"], rows: [["2026-06-01", 30_000, "", "many"]] },
      { date: 0, customer: -1, amount: 1, product: 2, quantity: 3 }
    );
    expect(facts[0].productName).toBeNull();
    expect(facts[0].quantity).toBeNull();
    expect(facts[0].unitPriceMmk).toBeNull();
  });
});
