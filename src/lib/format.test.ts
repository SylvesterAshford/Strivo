import { describe, it, expect } from "vitest";
import { formatCurrency } from "@/lib/format";

// Burmese unit thresholds (decided 2026-06-11): Myanmar businessmen count in
// သိန်း (100,000) and သန်း (1,000,000) — never the Indian "Cr". The သိန်း
// boundary at 100,000 and the သန်း switch at 100M are the regression points.
describe("formatCurrency", () => {
  it("shows raw value under 1,000", () => {
    expect(formatCurrency(850)).toBe("850 Ks");
    expect(formatCurrency(0)).toBe("0 Ks");
  });
  it("keeps full comma-grouped digits up to 99,999", () => {
    expect(formatCurrency(85_000)).toBe("85,000 Ks");
    expect(formatCurrency(1_500)).toBe("1,500 Ks");
  });
  it("switches to သိန်း at 100,000", () => {
    expect(formatCurrency(100_000)).toBe("1 သိန်း");
    expect(formatCurrency(150_000)).toBe("1.5 သိန်း");
    expect(formatCurrency(850_000)).toBe("8.5 သိန်း");
  });
  it("stays in သိန်း through tens of millions (the old Cr range)", () => {
    expect(formatCurrency(10_000_000)).toBe("100 သိန်း");
    expect(formatCurrency(92_000_000)).toBe("920 သိန်း");
  });
  it("switches to သန်း at 100,000,000", () => {
    expect(formatCurrency(100_000_000)).toBe("100 သန်း");
    expect(formatCurrency(150_000_000)).toBe("150 သန်း");
  });
  it("trims trailing .0 on unit amounts", () => {
    expect(formatCurrency(800_000)).toBe("8 သိန်း");
  });
  it("handles negatives with a leading sign", () => {
    expect(formatCurrency(-85_000)).toBe("-85,000 Ks");
    expect(formatCurrency(-150_000)).toBe("-1.5 သိန်း");
  });
  it("respects withUnit and abbreviated options", () => {
    expect(formatCurrency(85_000, { withUnit: false })).toBe("85,000");
    expect(formatCurrency(1_234_567, { abbreviated: false })).toBe("1,234,567 Ks");
  });
});
