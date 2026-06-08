import { describe, it, expect } from "vitest";
import { formatCurrency } from "@/lib/format";

// MMK abbreviation thresholds (design.md 8.2). Burmese MSMEs deal in lakhs and
// crores; the crore boundary (1 Cr = 10,000,000) is the one most likely to
// regress, so it's covered explicitly.
describe("formatCurrency", () => {
  it("shows raw value under 1,000", () => {
    expect(formatCurrency(850)).toBe("850 MMK");
    expect(formatCurrency(0)).toBe("0 MMK");
  });
  it("abbreviates thousands", () => {
    expect(formatCurrency(85_000)).toBe("85K MMK");
    expect(formatCurrency(850_000)).toBe("850K MMK");
  });
  it("abbreviates millions, trimming trailing .0", () => {
    expect(formatCurrency(8_500_000)).toBe("8.5M MMK");
    expect(formatCurrency(8_000_000)).toBe("8M MMK");
  });
  it("abbreviates crore at the 10,000,000 boundary", () => {
    expect(formatCurrency(10_000_000)).toBe("1Cr MMK");
    expect(formatCurrency(12_000_000)).toBe("1.2Cr MMK");
  });
  it("handles negatives with a leading sign", () => {
    expect(formatCurrency(-85_000)).toBe("-85K MMK");
  });
  it("respects withUnit and abbreviated options", () => {
    expect(formatCurrency(85_000, { withUnit: false })).toBe("85K");
    expect(formatCurrency(1_234_567, { abbreviated: false })).toBe("1,234,567 MMK");
  });
});
