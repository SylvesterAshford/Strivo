// Strict cell validation for ledger imports.
//
// Principle: a row that fails parsing is FLAGGED, never defaulted. The old
// `date ?? new Date()` fallback silently corrupted history (a garbage date
// cell landed as 2000-12-31 in prod, 2026-06-10). Flagged rows are returned
// to the caller so the preview UI can show them; they never reach `facts`.

import { MAX_PLAUSIBLE_MMK, MIN_IMPORT_DATE, MAX_FUTURE_DAYS } from "./constants";

/** Stable shape — the (deferred) preview UI renders this unchanged. */
export interface FlaggedRow {
  rowIndex: number; // 0-based index into the uploaded rows
  reason: "bad_date" | "bad_amount" | "missing_amount";
  rawValue: string; // the offending cell, verbatim, for display
}

const BURMESE_DIGITS: Record<string, string> = {
  "၀": "0", "၁": "1", "၂": "2", "၃": "3", "၄": "4",
  "၅": "5", "၆": "6", "၇": "7", "၈": "8", "၉": "9",
};

/** Transliterate Burmese numerals (၀-၉) to ASCII so ၁၂၃ parses as 123. */
export function toAsciiDigits(s: string): string {
  return s.replace(/[၀-၉]/g, (d) => BURMESE_DIGITS[d] ?? d);
}

export function cellText(raw: unknown): string {
  if (raw == null) return "";
  return String(raw).trim();
}

/**
 * Strict amount parse: finite, > 0, ≤ MAX_PLAUSIBLE_MMK. Returns null on any
 * violation — the caller decides between `bad_amount` and `missing_amount`.
 */
export function parseAmountStrict(raw: unknown): number | null {
  if (raw == null) return null;
  let n: number;
  if (typeof raw === "number") {
    n = raw;
  } else {
    const cleaned = toAsciiDigits(String(raw)).replace(/[^0-9.-]/g, "");
    if (cleaned === "") return null;
    n = parseFloat(cleaned);
  }
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded <= 0 || rounded > MAX_PLAUSIBLE_MMK) return null;
  return rounded;
}

// Allowlist (provisional — widen against real pilot ledgers):
//   ISO 8601           2026-06-01 / 2026-06-01T08:30:00Z
//   DD/MM/YYYY etc.    01/06/2026 · 01-06-2026 · 01.06.26
// Myanmar reads day-first, so D/M is the default; we only swap to M/D when
// the day position can't be a month but the month position can be a day.
const ISO_RE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;
const DMY_RE = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/;

function inWindow(d: Date): boolean {
  const max = Date.now() + MAX_FUTURE_DAYS * 86_400_000;
  return d.getTime() >= MIN_IMPORT_DATE.getTime() && d.getTime() <= max;
}

/**
 * Strict date parse against the allowlist + plausibility window
 * [MIN_IMPORT_DATE, now + MAX_FUTURE_DAYS]. Returns null on anything else —
 * including syntactically valid dates decades in the past.
 */
export function parseDateStrict(raw: unknown): Date | null {
  if (raw == null) return null;
  if (raw instanceof Date) {
    return !Number.isNaN(raw.getTime()) && inWindow(raw) ? raw : null;
  }
  const s = toAsciiDigits(String(raw)).trim();
  if (s === "") return null;

  if (ISO_RE.test(s)) {
    const d = new Date(s);
    return !Number.isNaN(d.getTime()) && inWindow(d) ? d : null;
  }

  const m = DMY_RE.exec(s);
  if (!m) return null;
  let day = parseInt(m[1], 10);
  let month = parseInt(m[2], 10);
  const year = m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
  if (day > 31 || month > 31) return null;
  if (month > 12) {
    if (day > 12) return null; // neither position can be a month
    [day, month] = [month, day]; // M/D-style cell; swap
  }
  const d = new Date(Date.UTC(year, month - 1, day));
  // Round-trip check rejects impossible dates like 31/02.
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null;
  }
  return inWindow(d) ? d : null;
}
