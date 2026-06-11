// Import guard thresholds — one place to change.

/**
 * Largest single-row amount we accept from a ledger import, in MMK.
 * ~1 billion kyats (≈ $500k USD) is beyond any plausible single MSME
 * transaction; bigger values are almost always unit mistakes or totals rows.
 */
export const MAX_PLAUSIBLE_MMK = 1_000_000_000;

/**
 * Max rows accepted by the import confirm routes. The preview route caps file
 * size at 5 MB, but a client can skip preview and POST JSON straight to
 * confirm — this is the guard for that path.
 */
export const MAX_CONFIRM_ROWS = 5_000;

/**
 * Plausibility window for imported dates. Anything outside is flagged, never
 * defaulted — a lenient `new Date()` on a garbage cell once landed a sale
 * dated 2000-12-31 in production.
 */
export const MIN_IMPORT_DATE = new Date(Date.UTC(2015, 0, 1));
export const MAX_FUTURE_DAYS = 366;
