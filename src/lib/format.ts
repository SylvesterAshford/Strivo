// Currency + number formatting — design.md 8.2.
// Arabic numerals everywhere (locked v1 decision).
//
// Units are the ones a Myanmar businessman actually speaks (decided
// 2026-06-11, replacing the Indian-English "Cr"/"M"/"K" + bank-speak "MMK"):
//   < 1,000                  -> "850 Ks"
//   1,000 – 99,999           -> "85,000 Ks"        (full digits, comma-grouped)
//   100,000 – <100,000,000   -> "1.5 သိန်း" / "920 သိန်း"   (သိန်း = 100,000)
//   >= 100,000,000           -> "150 သန်း"          (သန်း = 1,000,000)
// The Burmese unit word carries the magnitude, so no "Ks" suffix follows it.

const LAKH = 100_000; // သိန်း
const MILLION = 1_000_000; // သန်း

export function formatCurrency(
  amount: number,
  opts: { abbreviated?: boolean; withUnit?: boolean } = {},
): string {
  const { abbreviated = true, withUnit = true } = opts;
  const sign = amount < 0 ? "-" : "";
  const n = Math.abs(amount);

  if (!abbreviated) {
    return `${sign}${n.toLocaleString("en-US")}${withUnit ? " Ks" : ""}`;
  }

  if (n < LAKH) {
    const digits = n < 1_000 ? String(Math.round(n)) : Math.round(n).toLocaleString("en-US");
    return `${sign}${digits}${withUnit ? " Ks" : ""}`;
  }
  if (n < 100 * MILLION) {
    return `${sign}${trim(n / LAKH)} သိန်း`;
  }
  return `${sign}${trim(n / MILLION)} သန်း`;
}

/**
 * Split form for displays that render the unit separately (serif number +
 * small unit, e.g. AdvisorCard). The unit IS the magnitude for Burmese
 * amounts, so callers must always render it.
 */
export function formatCurrencyParts(amount: number): { value: string; unit: string } {
  const sign = amount < 0 ? "-" : "";
  const n = Math.abs(amount);
  if (n < LAKH) {
    const digits = n < 1_000 ? String(Math.round(n)) : Math.round(n).toLocaleString("en-US");
    return { value: `${sign}${digits}`, unit: "Ks" };
  }
  if (n < 100 * MILLION) return { value: `${sign}${trim(n / LAKH)}`, unit: "သိန်း" };
  return { value: `${sign}${trim(n / MILLION)}`, unit: "သန်း" };
}

// Drop a trailing ".0" so "8.0 သိန်း" reads "8 သိန်း" but "8.5 သိန်း" stays.
function trim(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// "2026-06" -> "JUN 2026". Used on Home (advisor) and Reports so both screens
// label the same reviewed month identically.
export function formatPeriodMonth(periodMonth: string): string {
  const [y, m] = periodMonth.split("-");
  const idx = Math.max(0, Math.min(11, parseInt(m, 10) - 1));
  return `${MONTH_ABBR[idx]} ${y}`;
}
