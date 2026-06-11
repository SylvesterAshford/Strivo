import { sql } from "drizzle-orm";
import { createId } from "@/lib/id";

// ── Count-aware import dedupe ─────────────────────────────────────────────────
//
// Re-uploading an updated ledger must be idempotent: only rows NOT already in
// the workspace land. Naive exists-checks silently drop genuine duplicates
// (two identical 2,000-MMK cups on one day), so we use MULTISET semantics:
//
//   file has 3 identical rows · DB already has 2  →  insert exactly 1
//
//   key = kind | amount | occurredAt-date | counterparty | description
//   ┌─ incoming file ─┐        ┌─ existing facts ─┐
//   │ key A ×3        │  diff  │ key A ×2          │ → insert A ×1
//   │ key B ×1        │ ─────▶ │ (B absent)        │ → insert B ×1
//   └─────────────────┘        └───────────────────┘
//
// Dedupe runs ONLY in import flows. Manual entry never dedupes (explicit user
// intent), and free-text imports stamp occurredAt=now so their keys never
// meaningfully collide.

export interface DedupableRow {
  kind: string;
  amountMmk: number | null;
  description: string;
  counterparty: string | null;
  occurredAt: Date;
}

function buildKey(
  kind: string,
  amountMmk: number | null,
  day: string,
  counterparty: string | null,
  description: string
): string {
  const cp = (counterparty ?? "").trim().toLowerCase();
  const desc = description.trim().toLowerCase();
  return `${kind}|${amountMmk ?? ""}|${day}|${cp}|${desc}`;
}

export function dedupeKey(r: DedupableRow): string {
  // Drivers serialize Date params as UTC ISO, and `timestamp` (no tz) stores
  // that wall time verbatim — so the stored day === the UTC day of the Date.
  const day = r.occurredAt.toISOString().slice(0, 10);
  return buildKey(r.kind, r.amountMmk, day, r.counterparty, r.description);
}

/**
 * Multiset difference: keep each incoming row only while its key count exceeds
 * the count already present in `existingCounts`. Pure — unit-testable.
 */
export function applyCountAwareDedupe<T extends DedupableRow>(
  incoming: T[],
  existingCounts: Map<string, number>
): { keep: T[]; skipped: number } {
  const remaining = new Map(existingCounts);
  const keep: T[] = [];
  let skipped = 0;
  for (const row of incoming) {
    const key = dedupeKey(row);
    const left = remaining.get(key) ?? 0;
    if (left > 0) {
      remaining.set(key, left - 1);
      skipped++;
    } else {
      keep.push(row);
    }
  }
  return { keep, skipped };
}

/**
 * Count existing facts in the workspace that fall inside the incoming rows'
 * date window, grouped by dedupe key. Volumes are MSME-scale (hundreds of
 * rows), so grouping in JS keeps the SQL trivial and the logic testable.
 *
 * `tx` is a Drizzle transaction/db with `.execute()`. RLS already scopes rows
 * to the workspace; the explicit filter is defense in depth.
 */
export async function fetchExistingCounts(
  tx: { execute: (q: ReturnType<typeof sql>) => Promise<unknown> },
  workspaceId: string,
  incoming: DedupableRow[]
): Promise<Map<string, number>> {
  if (incoming.length === 0) return new Map();
  const times = incoming.map((r) => r.occurredAt.getTime());
  const min = new Date(Math.min(...times));
  const max = new Date(Math.max(...times));
  // Pad to whole days so timezone-of-day differences can't exclude a match.
  min.setUTCHours(0, 0, 0, 0);
  max.setUTCHours(23, 59, 59, 999);
  // Bind as ISO strings, not Date objects: the production postgres driver
  // rejects Date bind params ("Received an instance of Date"), whereas PGlite
  // (used in tests) tolerates them. The `facts.occurred_at` column is a naive
  // `timestamp`, so the UTC wall time in the ISO string compares correctly
  // against stored values (which are themselves UTC wall time).
  const minIso = min.toISOString();
  const maxIso = max.toISOString();

  // Compute the day IN SQL: `timestamp` columns are timezone-naive, and
  // re-parsing their string form with new Date() shifts the day in non-UTC
  // locales. to_char reads the stored wall time verbatim, which matches the
  // UTC day used by dedupeKey for incoming rows.
  const raw = (await tx.execute(sql`
    SELECT kind, amount_mmk, description, counterparty,
           to_char(occurred_at, 'YYYY-MM-DD') AS day
    FROM facts
    WHERE workspace_id = ${workspaceId}
      AND occurred_at BETWEEN ${minIso} AND ${maxIso}
  `)) as unknown;
  // postgres-js returns the row array directly; PGlite wraps it as { rows }.
  const res = (Array.isArray(raw) ? raw : (raw as { rows: unknown[] }).rows) as Array<{
    kind: string;
    amount_mmk: number | null;
    description: string;
    counterparty: string | null;
    day: string;
  }>;

  const counts = new Map<string, number>();
  for (const row of res) {
    const key = buildKey(row.kind, row.amount_mmk, row.day, row.counterparty, row.description);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export type ImportSource =
  | "sales-excel"
  | "expenses-excel"
  | "sales-text"
  | "expenses-text";

export function newBatchId(): string {
  return `imp_${createId()}`;
}
