import { supabase } from "@/lib/supabase-browser";
import { clientEnv as env } from "@/lib/client-env";
import type { AdvisorHome, ActionKey } from "@/lib/advisor/monthly";

export type { AdvisorHome, AdvisorAction, AdvisorAlert, ActionKey, BusinessHealthStatus, InsightConfidence } from "@/lib/advisor/monthly";

// Authed fetch against the Next.js backend. Attaches the current Supabase JWT
// as a bearer token; the backend validates it via the mobile auth bridge. The
// web app is same-origin with the API, so `env.apiBaseUrl` is "" (relative).
// `timeoutMs` defaults to 30s for normal queries; LLM-bound endpoints pass a
// higher value so Gemini has time to think.
async function authedFetch(
  path: string,
  init: RequestInit = {},
  timeoutMs = 30_000
): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${env.apiBaseUrl}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function authedJson<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 30_000
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  const res = await authedFetch(path, { ...init, headers }, timeoutMs);
  if (!res.ok) {
    // Pull the JSON error body so Zod validation failures surface in the UI.
    const detail = await res.text().catch(() => "");
    throw new Error(`API ${path} returned ${res.status}: ${detail.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

// Recover the real Blob behind an object URL produced by the web file picker
// (see src/rn/expo.ts). fetch() on a blob: URL returns the underlying bytes.
async function blobFromUri(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  return res.blob();
}

async function bearerHeaders(): Promise<Headers> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return headers;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface WorkspaceSync {
  id: string;
  name: string;
  businessDescription: string | null;
  businessType: string | null;
  // True when the backend workspace already has profile data (returning or
  // seeded user). The client uses this to skip the onboarding wizard.
  onboarded: boolean;
}

export async function syncWorkspace(): Promise<WorkspaceSync | null> {
  try {
    const json = await authedJson<{ workspace: WorkspaceSync }>("/api/mobile/v1/auth/sync", { method: "POST" });
    return json.workspace;
  } catch {
    return null;
  }
}

// ── Business profile ────────────────────────────────────────────────────────

export type SalesPeriod = "daily" | "weekly" | "monthly" | "yearly";
export type RivalTier = "discount" | "matcher" | "premium";

export interface RivalDetail {
  name: string;
  tier: RivalTier;
  audience: string;
}

export interface ProductSeed {
  name: string;
  priceMmk?: number;
}

export interface SupplierSeed {
  name: string;
  supplies?: string;
}

export interface ExpenseSeed {
  category: string;
  monthlyMmk?: number;
}

export interface BusinessProfile {
  businessName: string;
  businessType: string | null;
  productService: string | null;
  location: string | null;
  monthlyTargetMmk: number | null;
  biggestChallenge: string | null;
  budgetMmk: number | null;
  competitors: string[];
  posEnabled: boolean | null;
  salesPeriods: SalesPeriod[];
  salesValues: Partial<Record<SalesPeriod, number>>;
  monthlyExpensesMmk: number | null;
  expensesSeed: ExpenseSeed[];
  competitorDetails: RivalDetail[];
  customersSeed: string[];
  productsSeed: ProductSeed[];
  suppliersSeed: SupplierSeed[];
  /** Shop photo / logo as a small JPEG data URL, or null. */
  avatarUrl: string | null;
}

export async function fetchProfile(): Promise<BusinessProfile | null> {
  try {
    const json = await authedJson<{ profile: BusinessProfile }>("/api/mobile/v1/profile");
    return json.profile;
  } catch {
    return null;
  }
}

export async function saveProfile(patch: Partial<BusinessProfile>): Promise<BusinessProfile | null> {
  const json = await authedJson<{ profile: BusinessProfile }>("/api/mobile/v1/profile", {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  return json.profile;
}

// ── Home metric ───────────────────────────────────────────────────────────────

export interface RecentEntry {
  id: string;
  kind: "sale" | "expense" | "receivable" | "note";
  description: string;
  amountMmk: number | null;
  counterparty: string | null;
  occurredAt?: string;
}

export interface HomeData {
  todaySalesMmk: number;
  todayExpensesMmk: number;
  yesterdaySalesMmk: number;
  weekSalesMmk: number;
  monthRevenueMmk: number;
  outstandingMmk: number;
  recentToday: RecentEntry[];
  recentFallback: RecentEntry[];
  // Monthly Profit Advisor — derived server-side from the most-recent month with
  // data. Null when there's no data yet, or if derivation failed (the basic home
  // fields still render; see home/route.ts).
  advisor: AdvisorHome | null;
}

// Dashboard reads throw on failure so React Query exposes isError — a failed
// request must be distinguishable from a genuinely empty account (which renders
// the cold-start state). Config-style reads (syncWorkspace, fetchProfile) stay
// tolerant because they have intentional "treat missing as default" semantics.
export async function fetchHome(): Promise<HomeData> {
  return authedJson<HomeData>("/api/mobile/v1/home");
}

// Record advisor action feedback (the action loop). Fire-and-forget from the UI;
// the only success signal that matters is whether owners act on advice.
export async function logAdvisorAction(
  actionKey: ActionKey,
  status: "done" | "skip",
  periodMonth: string,
): Promise<void> {
  await authedJson("/api/mobile/v1/advisor/action", {
    method: "POST",
    body: JSON.stringify({ actionKey, status, periodMonth }),
  });
}

// ── Reports ───────────────────────────────────────────────────────────────────

export interface WeekDay {
  label: string;
  salesMmk: number;
  expensesMmk: number;
}

export interface ReportTopCustomer {
  name: string;
  totalMmk: number;
  count: number;
}

export interface ReportCategory {
  kind: "sale" | "expense" | "receivable" | "note";
  totalMmk: number;
  count: number;
}

export interface ReportExpenseCategory {
  category: string;
  totalMmk: number;
  count: number;
}

export interface ReportTopProduct {
  name: string;
  totalMmk: number;
  units: number;
  count: number;
}

/** Which valuable inputs this workspace has EVER provided — drives the
 *  unlock-next recruiting slot (input contract, CEO plan 2026-06-11). */
export interface DataCoverage {
  hasExpenses: boolean;
  hasProducts: boolean;
  hasCounterparties: boolean;
}

export interface ReportsData {
  week: WeekDay[];
  month: { periodMonth: string; salesMmk: number; expensesMmk: number; netMmk: number };
  topCustomers: ReportTopCustomer[];
  categories: ReportCategory[];
  expenseCategories: ReportExpenseCategory[];
  receivables: {
    id: string;
    description: string;
    amountMmk: number | null;
    counterparty: string | null;
    occurredAt: string;
  }[];
  topProducts: ReportTopProduct[];
  coverage: DataCoverage;
}

export async function fetchReports(): Promise<ReportsData> {
  return authedJson<ReportsData>("/api/mobile/v1/reports");
}

/** Drill-down: the transactions behind a figure, filtered by month (YYYY-MM) and/or kind. */
export async function fetchTransactions(params: { month?: string; kind?: string }): Promise<{ entries: RecentEntry[] }> {
  const q = new URLSearchParams();
  if (params.month) q.set("month", params.month);
  if (params.kind) q.set("kind", params.kind);
  const qs = q.toString();
  return authedJson<{ entries: RecentEntry[] }>(`/api/mobile/v1/facts${qs ? `?${qs}` : ""}`);
}

// ── Facts (manual + import entry) ───────────────────────────────────────────

export interface DraftFact {
  kind: "sale" | "expense" | "receivable" | "note";
  amountMmk?: number;
  description: string;
  counterparty?: string;
  // Expense sub-category (e.g. "ဆိုင်ခ"). Optional on non-expense kinds.
  category?: string;
}

/** Save the user-confirmed (and possibly edited) facts. */
export async function confirmFacts(facts: DraftFact[]): Promise<void> {
  await authedJson("/api/mobile/v1/facts/confirm", {
    method: "POST",
    body: JSON.stringify({ facts }),
  });
}

/** Delete a single fact by ID. */
export async function deleteFact(id: string): Promise<void> {
  const headers = await bearerHeaders();
  await fetch(`${env.apiBaseUrl}/api/mobile/v1/facts/${id}`, {
    method: "DELETE",
    headers,
  });
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface KindBreakdown {
  kind: "sale" | "expense" | "receivable" | "note";
  totalMmk: number;
  count: number;
}

export interface TopCounterparty {
  name: string;
  totalMmk: number;
  count: number;
}

export interface AnalyticsEntry {
  id: string;
  kind: "sale" | "expense" | "receivable" | "note";
  description: string;
  amountMmk: number | null;
  counterparty: string | null;
  occurredAt: string;
}

export interface AnalyticsData {
  breakdown: KindBreakdown[];
  topCounterparties: TopCounterparty[];
  recent: AnalyticsEntry[];
}

export async function fetchAnalytics(): Promise<AnalyticsData> {
  return authedJson<AnalyticsData>("/api/mobile/v1/analytics");
}

// ── Account ──────────────────────────────────────────────────────────────────

/** Download all of the user's data as a JSON string. */
export async function exportMyData(): Promise<string> {
  const headers = await bearerHeaders();
  const res = await fetch(`${env.apiBaseUrl}/api/mobile/v1/users/me/export`, { headers });
  if (!res.ok) {
    throw new Error(`Export failed (${res.status})`);
  }
  return res.text();
}

/** Delete the authenticated user's workspace + facts, plus the
 *  Supabase auth row when real auth is on. Cascades server-side. */
export async function deleteMyAccount(): Promise<void> {
  await authedJson<{ deleted: true }>("/api/mobile/v1/users/me", { method: "DELETE" });
}

// ── Excel sales import ──────────────────────────────────────────────────────

export interface ColumnMapping {
  date: number;
  customer: number;
  amount: number;
  product: number;
  quantity: number;
}

/** A row excluded for data quality — surfaced to the user, never inserted. */
export interface FlaggedImportRow {
  rowIndex: number;
  reason: "bad_date" | "bad_amount" | "missing_amount";
  rawValue: string;
}

export interface ImportConfirmResponse {
  inserted: number;
  skipped: number;
  batchId: string;
  flagged: FlaggedImportRow[];
  flaggedCount: number;
}

export interface ImportPreviewResponse {
  headers: string[];
  sampleRows: (string | number | null)[][];
  rows: (string | number | null)[][];
  mapping: ColumnMapping;
  totalRows: number;
  usableRows: number;
  flagged: FlaggedImportRow[];
  flaggedCount: number;
}

/** Upload an XLSX/XLS file. Backend parses + LLM-detects column mapping. */
export async function importSalesPreview(
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<ImportPreviewResponse> {
  const form = new FormData();
  const blob = await blobFromUri(fileUri);
  form.append("file", new File([blob], fileName, { type: mimeType }));

  const headers = await bearerHeaders();
  const controller = new AbortController();
  // XLSX parse + Gemini column detection — generous timeout.
  const timer = setTimeout(() => controller.abort(), 120_000);
  let res: Response;
  try {
    res = await fetch(`${env.apiBaseUrl}/api/mobile/v1/sales/import/preview`, {
      method: "POST",
      headers,
      body: form,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Preview failed (${res.status})`);
  }
  return res.json() as Promise<ImportPreviewResponse>;
}

/** Confirm the (possibly edited) column mapping and bulk-insert facts.
 *  Server dedupes against prior imports — `skipped` rows already existed. */
export async function importSalesConfirm(
  headers: string[],
  rows: (string | number | null)[][],
  mapping: ColumnMapping,
  fileName?: string
): Promise<ImportConfirmResponse> {
  return authedJson<ImportConfirmResponse>(
    "/api/mobile/v1/sales/import/confirm",
    {
      method: "POST",
      body: JSON.stringify({ headers, rows, mapping, fileName }),
    }
  );
}

/** Extract a product catalogue from an Excel or PDF file. Returns the list — caller saves. */
export async function importProductsFile(
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<{ products: ProductSeed[] }> {
  const form = new FormData();
  const blob = await blobFromUri(fileUri);
  form.append("file", new File([blob], fileName, { type: mimeType }));

  const headers = await bearerHeaders();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 240_000);
  let res: Response;
  try {
    res = await fetch(`${env.apiBaseUrl}/api/mobile/v1/products/import/file`, {
      method: "POST",
      headers,
      body: form,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Import failed (${res.status})`);
  }
  return res.json() as Promise<{ products: ProductSeed[] }>;
}

/** Extract a product catalogue from a pasted text block. */
export async function importProductsText(text: string): Promise<{ products: ProductSeed[] }> {
  return authedJson<{ products: ProductSeed[] }>(
    "/api/mobile/v1/products/import/text",
    { method: "POST", body: JSON.stringify({ text }) },
    240_000
  );
}

/** Paste a free-text ledger / message. LLM extracts facts, server bulk-inserts. */
export async function importSalesText(text: string): Promise<{ inserted: number; error?: string }> {
  return authedJson<{ inserted: number; error?: string }>(
    "/api/mobile/v1/sales/import/text",
    {
      method: "POST",
      body: JSON.stringify({ text }),
    },
    // Burmese fact extraction + 3 Gemini retries with backoff can take a
    // while; budget plenty of headroom so we aren't aborting mid-extraction.
    240_000
  );
}

// ── Excel/text expense import ───────────────────────────────────────────────

export interface ExpenseColumnMapping {
  date: number;
  amount: number;
  category: number;
  description: number;
  counterparty: number;
}

export interface ExpenseImportPreviewResponse {
  headers: string[];
  sampleRows: (string | number | null)[][];
  rows: (string | number | null)[][];
  mapping: ExpenseColumnMapping;
  totalRows: number;
  usableRows: number;
  flagged: FlaggedImportRow[];
  flaggedCount: number;
}

export async function importExpensesPreview(
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<ExpenseImportPreviewResponse> {
  const form = new FormData();
  const blob = await blobFromUri(fileUri);
  form.append("file", new File([blob], fileName, { type: mimeType }));

  const headers = await bearerHeaders();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  let res: Response;
  try {
    res = await fetch(`${env.apiBaseUrl}/api/mobile/v1/expenses/import/preview`, {
      method: "POST",
      headers,
      body: form,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Preview failed (${res.status})`);
  }
  return res.json() as Promise<ExpenseImportPreviewResponse>;
}

export async function importExpensesConfirm(
  headers: string[],
  rows: (string | number | null)[][],
  mapping: ExpenseColumnMapping,
  fileName?: string
): Promise<ImportConfirmResponse> {
  return authedJson<ImportConfirmResponse>(
    "/api/mobile/v1/expenses/import/confirm",
    {
      method: "POST",
      body: JSON.stringify({ headers, rows, mapping, fileName }),
    }
  );
}

// ── Import history (batches) ─────────────────────────────────────────────────

export interface ImportBatch {
  id: string;
  source: "sales-excel" | "expenses-excel" | "sales-text" | "expenses-text";
  fileName: string | null;
  rowCount: number;
  insertedCount: number;
  skippedCount: number;
  createdAt: string;
}

/** List previous imports, newest first. */
export async function fetchImports(): Promise<{ batches: ImportBatch[] }> {
  return authedJson<{ batches: ImportBatch[] }>("/api/mobile/v1/imports");
}

/** Undo an import — deletes the batch and every fact it created. */
export async function deleteImportBatch(id: string): Promise<void> {
  await authedJson<{ deleted: true }>(`/api/mobile/v1/imports/${id}`, { method: "DELETE" });
}

export async function importExpensesText(
  text: string
): Promise<{ inserted: number; error?: string }> {
  return authedJson<{ inserted: number; error?: string }>(
    "/api/mobile/v1/expenses/import/text",
    { method: "POST", body: JSON.stringify({ text }) },
    240_000
  );
}

// ── Strategic insights (AI) ─────────────────────────────────────────────────

export interface BusinessMetrics {
  periodDays: number;
  totalSalesMmk: number;
  totalExpensesMmk: number;
  netProfitMmk: number;
  profitMarginPct: number;
  salesTrendPct: number;
  avgDailySalesMmk: number;
  txCount: number;
  outstandingReceivablesMmk: number;
  topCustomers: { name: string; totalMmk: number; count: number }[];
  customerConcentrationPct: number;
  expenseRatioPct: number;
  dailySeries: { date: string; salesMmk: number; expensesMmk: number }[];
  salesForecast: number[];
  customerSegments: { key: "loyal" | "occasional" | "oneTime" | "walkIn"; customers: number; totalMmk: number }[];
}

export interface Recommendation {
  title: string;
  advice: string;
  steps: string[];
}

export interface Swot {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface StrategicInsights {
  metrics: BusinessMetrics;
  headline: string;
  growthScore: number;
  marketScore: number;
  riskLevel: "low" | "medium" | "high";
  riskReason: string;
  swot: Swot;
  forecastNote: string;
  recommendations: {
    promotion: Recommendation;
    stock: Recommendation;
    pricing: Recommendation;
    growth: Recommendation;
  };
}

export interface AnalyticsReceivable {
  id: string;
  description: string;
  amountMmk: number | null;
  counterparty: string | null;
  occurredAt: string;
}

export type InsightsResponse =
  | { ready: false }
  | {
      ready: true;
      // Deterministic, reconciles with Home/Reports. Always present when ready.
      analytics: { advisor: AdvisorHome | null; receivables: AnalyticsReceivable[] };
      // LLM strategic blob (recommendations + scenario). Null until first regen lands.
      insights: StrategicInsights | null;
      generatedAt: string | null;
      regenerating: boolean;
    };

// ── Scenarios (AI what-if) ──────────────────────────────────────────────────

export interface ScenarioResult {
  headline: string;
  estimatedImpact: {
    salesPct: number;
    marginPct: number;
    risk: "low" | "medium" | "high";
  };
  watchFor: string[];
  steps: string[];
  caveats: string[];
}

export type ScenarioResponse =
  | { ready: false }
  | { ready: true; result: ScenarioResult };

/** Run a what-if scenario against the cached insights report. */
export async function runInsightScenario(scenario: string): Promise<ScenarioResponse> {
  return authedJson<ScenarioResponse>(
    "/api/mobile/v1/insights/scenario",
    { method: "POST", body: JSON.stringify({ scenario }) },
    // Burmese reasoning + retries — be generous.
    180_000
  );
}

export async function fetchInsights(): Promise<InsightsResponse> {
  // Cold-start insights generation can take 20-40s on Burmese with Gemini retries.
  return authedJson<InsightsResponse>("/api/mobile/v1/insights", {}, 120_000);
}
