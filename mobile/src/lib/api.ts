import { supabase } from "@/lib/supabase";
import { env } from "@/lib/env";

// Authed fetch against the Next.js backend. Attaches the current Supabase JWT
// as a bearer token; the backend validates it via the mobile auth bridge.
async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(`${env.apiBaseUrl}${path}`, { ...init, headers });
}

async function authedJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  const res = await authedFetch(path, { ...init, headers });
  if (!res.ok) {
    // Pull the JSON error body so Zod validation failures surface in the UI.
    const detail = await res.text().catch(() => "");
    throw new Error(`API ${path} returned ${res.status}: ${detail.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface WorkspaceSync {
  id: string;
  name: string;
  businessDescription: string | null;
}

export async function syncWorkspace(): Promise<WorkspaceSync | null> {
  if (!env.apiBaseUrl) return null;
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
  competitorDetails: RivalDetail[];
  customersSeed: string[];
  productsSeed: ProductSeed[];
  suppliersSeed: SupplierSeed[];
}

export async function fetchProfile(): Promise<BusinessProfile | null> {
  if (!env.apiBaseUrl) return null;
  try {
    const json = await authedJson<{ profile: BusinessProfile }>("/api/mobile/v1/profile");
    return json.profile;
  } catch {
    return null;
  }
}

export async function saveProfile(patch: Partial<BusinessProfile>): Promise<BusinessProfile | null> {
  if (!env.apiBaseUrl) return null;
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
}

export interface HomeData {
  todaySalesMmk: number;
  todayExpensesMmk: number;
  yesterdaySalesMmk: number;
  weekSalesMmk: number;
  monthRevenueMmk: number;
  outstandingMmk: number;
  recentToday: RecentEntry[];
}

export async function fetchHome(): Promise<HomeData | null> {
  if (!env.apiBaseUrl) return null;
  try {
    return await authedJson<HomeData>("/api/mobile/v1/home");
  } catch {
    return null;
  }
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

export interface ReportsData {
  week: WeekDay[];
  month: { salesMmk: number; expensesMmk: number; netMmk: number };
  topCustomers: ReportTopCustomer[];
  categories: ReportCategory[];
  receivables: {
    id: string;
    description: string;
    amountMmk: number | null;
    counterparty: string | null;
    occurredAt: string;
  }[];
}

export async function fetchReports(): Promise<ReportsData | null> {
  if (!env.apiBaseUrl) return null;
  try {
    return await authedJson<ReportsData>("/api/mobile/v1/reports");
  } catch {
    return null;
  }
}

// ── Voice pipeline ────────────────────────────────────────────────────────────

export interface DraftFact {
  kind: "sale" | "expense" | "receivable" | "note";
  amountMmk?: number;
  description: string;
  counterparty?: string;
}

export interface VoiceUploadResult {
  recordingId: string;
  transcript: string;
  facts: DraftFact[];
}

/** Upload a recorded audio file for transcription and fact extraction. */
export async function uploadVoice(
  audioUri: string,
  mimeType: string,
  durationSecs: number
): Promise<VoiceUploadResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const form = new FormData();
  // React Native's FormData accepts { uri, type, name } objects for file fields
  form.append("audio", { uri: audioUri, type: mimeType, name: "recording.m4a" } as unknown as Blob);
  form.append("durationSecs", String(Math.round(durationSecs)));

  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);

  const res = await fetch(`${env.apiBaseUrl}/api/mobile/v1/voice/upload`, {
    method: "POST",
    headers,
    body: form,
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Upload failed (${res.status})`);
  }
  return res.json() as Promise<VoiceUploadResult>;
}

/** Save the user-confirmed (and possibly edited) facts. */
export async function confirmFacts(
  recordingId: string | null,
  facts: DraftFact[]
): Promise<void> {
  await authedJson("/api/mobile/v1/facts/confirm", {
    method: "POST",
    body: JSON.stringify({ recordingId: recordingId ?? undefined, facts }),
  });
}

/** Delete a single fact by ID. */
export async function deleteFact(id: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
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

export async function fetchAnalytics(): Promise<AnalyticsData | null> {
  if (!env.apiBaseUrl) return null;
  try {
    return await authedJson<AnalyticsData>("/api/mobile/v1/analytics");
  } catch {
    return null;
  }
}

// ── Excel sales import ──────────────────────────────────────────────────────

export interface ColumnMapping {
  date: number;
  customer: number;
  amount: number;
  product: number;
  quantity: number;
}

export interface ImportPreviewResponse {
  headers: string[];
  sampleRows: (string | number | null)[][];
  rows: (string | number | null)[][];
  mapping: ColumnMapping;
  totalRows: number;
}

/** Upload an XLSX/XLS file. Backend parses + LLM-detects column mapping. */
export async function importSalesPreview(
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<ImportPreviewResponse> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const form = new FormData();
  form.append("file", { uri: fileUri, type: mimeType, name: fileName } as unknown as Blob);

  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);

  const res = await fetch(`${env.apiBaseUrl}/api/mobile/v1/sales/import/preview`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Preview failed (${res.status})`);
  }
  return res.json() as Promise<ImportPreviewResponse>;
}

/** Confirm the (possibly edited) column mapping and bulk-insert facts. */
export async function importSalesConfirm(
  headers: string[],
  rows: (string | number | null)[][],
  mapping: ColumnMapping
): Promise<{ inserted: number }> {
  return authedJson<{ inserted: number }>("/api/mobile/v1/sales/import/confirm", {
    method: "POST",
    body: JSON.stringify({ headers, rows, mapping }),
  });
}

/** Paste a free-text ledger / message. LLM extracts facts, server bulk-inserts. */
export async function importSalesText(text: string): Promise<{ inserted: number; error?: string }> {
  return authedJson<{ inserted: number; error?: string }>("/api/mobile/v1/sales/import/text", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
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

export type InsightsResponse =
  | { ready: false }
  | {
      ready: true;
      insights: StrategicInsights;
      generatedAt: string | null;
      regenerating: boolean;
    };

export async function fetchInsights(): Promise<InsightsResponse | null> {
  if (!env.apiBaseUrl) return null;
  try {
    return await authedJson<InsightsResponse>("/api/mobile/v1/insights");
  } catch {
    return null;
  }
}
