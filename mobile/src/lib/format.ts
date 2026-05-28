// Currency + number formatting — design.md 8.2.
// Arabic numerals everywhere (locked v1 decision). MMK unit.

// Thresholds:
//   < 1,000                 -> "850 MMK"
//   1,000 - 99,999          -> "85K MMK"
//   100,000 - 999,999       -> "850K MMK"
//   1,000,000 - 9,999,999   -> "8.5M MMK"
//   >= 10,000,000           -> "1.2Cr MMK"   (1 crore = 10,000,000)
export function formatCurrency(
  amount: number,
  opts: { abbreviated?: boolean; withUnit?: boolean } = {},
): string {
  const { abbreviated = true, withUnit = true } = opts;
  const unit = withUnit ? " MMK" : "";
  const sign = amount < 0 ? "-" : "";
  const n = Math.abs(amount);

  if (!abbreviated) {
    return `${sign}${n.toLocaleString("en-US")}${unit}`;
  }

  let body: string;
  if (n < 1_000) {
    body = String(Math.round(n));
  } else if (n < 100_000) {
    body = `${trim(n / 1_000)}K`;
  } else if (n < 1_000_000) {
    body = `${Math.round(n / 1_000)}K`;
  } else if (n < 10_000_000) {
    body = `${trim(n / 1_000_000)}M`;
  } else {
    body = `${trim(n / 10_000_000)}Cr`;
  }
  return `${sign}${body}${unit}`;
}

// Drop a trailing ".0" so "8.0M" reads "8M" but "8.5M" stays.
function trim(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
