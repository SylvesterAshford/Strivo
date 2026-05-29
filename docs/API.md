# Strivo — API Reference (v1)

**Codebase:** Lattice • **Base URL (dev):** `http://<lan-ip>:3000` • **Last updated:** 2026-05-29

This document describes every HTTP endpoint exposed by the Strivo Next.js backend, plus the Supabase Edge Function (`gemini-proxy`) used to reach Gemini from Myanmar.

---

## Table of contents

1. Conventions
2. Authentication
3. Errors
4. Endpoints
   - 4.1 Auth — `/api/mobile/v1/auth/*`
   - 4.2 Home — `/api/mobile/v1/home`
   - 4.3 Reports — `/api/mobile/v1/reports`
   - 4.4 Analytics — `/api/mobile/v1/analytics`
   - 4.5 Insights — `/api/mobile/v1/insights`
   - 4.6 Profile — `/api/mobile/v1/profile`
   - 4.7 Voice — `/api/mobile/v1/voice/upload`
   - 4.8 Facts — `/api/mobile/v1/facts/*`
   - 4.9 Sales import — `/api/mobile/v1/sales/import/*`
   - 4.10 Products import — `/api/mobile/v1/products/import/*`
5. Supabase Edge Function — `gemini-proxy`
6. Shared schemas

---

## 1. Conventions

- All endpoints live under `/api/mobile/v1/` (one stable version, mobile-only).
- All request and response bodies are JSON unless explicitly multipart.
- Timestamps are ISO 8601 strings.
- Monetary amounts are integers in MMK (kyats).
- Workspace scoping is implicit — every endpoint operates on the workspace of the authenticated user.
- All routes use `runtime = "nodejs"` on the backend.

---

## 2. Authentication

Every endpoint requires:

```
Authorization: Bearer <Supabase JWT>
```

The backend validates the JWT via `authenticateMobileRequest()`. On the first authenticated request, `getOrCreateMobileWorkspace()` provisions a workspace if the user doesn't have one.

### Dev bypass

When the backend env `AUTH_BYPASS=true` (default in `NODE_ENV=development`), the validator skips JWT checks and returns a stub user:

```
id:    "dev_local_user"
email: "dev@local.lattice"
```

Mobile clients can mirror this by setting `EXPO_PUBLIC_AUTH_BYPASS=true` to skip the login screens entirely. Production builds default to `false` on both sides.

---

## 3. Errors

Error responses have the shape:

```json
{ "error": "<string | zod.flatten() output>" }
```

| Status | When |
|---|---|
| 200 | Success |
| 400 | Validation failure — body is the Zod `flatten()` output for typed inputs |
| 401 | Missing / invalid Supabase JWT (when `AUTH_BYPASS=false`) |
| 502 | Upstream LLM (Gemini) error after the in-provider retry chain exhausted |

The LLM provider already retries transient upstream 5xx (`503 UNAVAILABLE`, `429`, "high demand") 3× with exponential backoff (0.8 → 1.6 → 3.2s). Clients should treat a final 502 as a real outage signal, not transient.

---

## 4. Endpoints

### 4.1 Auth

#### `POST /api/mobile/v1/auth/sync`

Provision the user + workspace if they don't exist. Idempotent — safe to call on every cold start. The mobile client calls this once after each Supabase `SIGNED_IN` event.

**Request:** no body.

**Response 200:**
```json
{
  "workspace": {
    "id": "ws_<cuid>",
    "name": "My workspace",
    "businessDescription": null
  }
}
```

---

### 4.2 Home

#### `GET /api/mobile/v1/home`

Returns the rollups the Home screen renders, computed from `facts` rows in the user's workspace.

**Response 200:**
```json
{
  "todaySalesMmk": 19500,
  "todayExpensesMmk": 23000,
  "yesterdaySalesMmk": 24500,
  "weekSalesMmk": 199000,
  "monthRevenueMmk": 1249000,
  "outstandingMmk": 20000,
  "recentToday": [
    {
      "id": "fact_<cuid>",
      "kind": "sale",
      "description": "မုန့်ဟင်းခါး ၂ ပွဲ",
      "amountMmk": 6000,
      "counterparty": "ကိုအောင်"
    }
    // up to 5 entries, newest first
  ]
}
```

**Notes:**
- All amount windows are rolling, computed in the server's local time.
- Up to 5 recent entries; older facts come back via `/reports` and `/analytics`.
- All sum queries run in parallel (`Promise.all`) — typical warm latency is 250–600 ms against Neon.

---

### 4.3 Reports

#### `GET /api/mobile/v1/reports`

Returns 7-day strip, month totals, top customers, category breakdown, and open receivables.

**Response 200:**
```json
{
  "week": [
    { "label": "MON", "salesMmk": 31000, "expensesMmk": 79500 }
    // 7 days, oldest first; today's label is "TODAY"
  ],
  "month": {
    "salesMmk": 1142000,
    "expensesMmk": 580500,
    "netMmk": 561500
  },
  "topCustomers": [
    { "name": "ကိုအောင်", "totalMmk": 994000, "count": 41 }
    // up to 5, descending by totalMmk
  ],
  "categories": [
    { "kind": "sale",       "totalMmk": 1142000, "count": 87 },
    { "kind": "expense",    "totalMmk": 580500,  "count": 32 },
    { "kind": "receivable", "totalMmk": 20000,   "count": 2  },
    { "kind": "note",       "totalMmk": 0,       "count": 4  }
  ],
  "receivables": [
    {
      "id": "fact_<cuid>",
      "description": "ကိုကျော် ကြွေးကျန်",
      "amountMmk": 12000,
      "counterparty": "ကိုကျော်",
      "occurredAt": "2026-05-28T03:30:00.000Z"
    }
    // up to 20, oldest first
  ]
}
```

---

### 4.4 Analytics

#### `GET /api/mobile/v1/analytics`

Internal aggregate used by some surfaces. Most consumer surfaces use `/insights` instead.

**Response 200:**
```json
{
  "breakdown": [
    { "kind": "sale",       "totalMmk": 1142000, "count": 87 },
    { "kind": "expense",    "totalMmk": 580500,  "count": 32 }
  ],
  "topCounterparties": [
    { "name": "ကိုအောင်", "totalMmk": 994000, "count": 41 }
  ],
  "recent": [
    {
      "id": "fact_<cuid>",
      "kind": "sale",
      "description": "...",
      "amountMmk": 9000,
      "counterparty": "...",
      "occurredAt": "..."
    }
    // up to 10
  ]
}
```

---

### 4.5 Insights (AI)

#### `GET /api/mobile/v1/insights`

Returns the latest cached `StrategicInsights` blob, or — on first call for a workspace — generates one inline. Background regen is also kicked off automatically after every fact mutation (`POST /facts/confirm`, `DELETE /facts/[id]`).

**Response 200 — no signal yet (no sales/expenses):**
```json
{ "ready": false }
```

**Response 200 — ready (cached or freshly generated):**
```json
{
  "ready": true,
  "insights": { /* StrategicInsights — see §6 */ },
  "generatedAt": "2026-05-28T07:12:09.421Z",
  "regenerating": false
}
```

`regenerating: true` indicates the cache was stale (>6h old) and a background regen has been triggered. The mobile UI can show a small "updating…" hint without blocking.

**Response 502:** Gemini failed during cold-start generation (after retries).

**Notes:**
- Cache served instantly (~50ms).
- First-time cold start can take 20–40s on Burmese due to Gemini reasoning + 3-retry safety window.
- Stale cutoff: 6 hours.

---

### 4.6 Profile

#### `GET /api/mobile/v1/profile`

**Response 200:**
```json
{
  "profile": {
    "businessName": "မင်း ဘုန်းဆန်း ဆိုင်",
    "businessType": "fnb",
    "productService": "မုန့်ဟင်းခါး၊ ကော်ဖီ၊ မနက်စာ",
    "location": "ရန်ကုန်၊ မြောက်ဥက္ကလာ",
    "monthlyTargetMmk": 1500000,
    "biggestChallenge": "ရောင်းအား မညီမှု၊ ဖောက်သည် မမှန်ခြင်း",
    "budgetMmk": 200000,
    "competitors": ["ဦးကြီး မုန့်ဟင်းခါး", "ရတနာ ကော်ဖီ"],
    "posEnabled": false,
    "salesPeriods": ["daily", "monthly"],
    "salesValues": { "daily": 50000, "monthly": 1500000 },
    "monthlyExpensesMmk": 200000,
    "competitorDetails": [
      { "name": "ဦးကြီး", "tier": "matcher", "audience": "ကျောင်းသား" }
    ],
    "customersSeed": ["ကိုအောင်", "မမေ"],
    "productsSeed": [
      { "name": "မုန့်ဟင်းခါး", "priceMmk": 2000 }
    ],
    "suppliersSeed": [
      { "name": "ဦးကြီး", "supplies": "ဆန်" }
    ]
  }
}
```

#### `PUT /api/mobile/v1/profile`

Partial update — only fields present in the body are written. All fields are optional. Empty `businessName` is rejected (`min(1)`).

**Request body (all fields optional):**
```json
{
  "businessName": "...",
  "businessType": "fnb",
  "productService": "...",
  "location": "...",
  "monthlyTargetMmk": 1500000,
  "biggestChallenge": "...",
  "budgetMmk": 200000,
  "competitors": ["string", "..."],
  "posEnabled": true,
  "salesPeriods": ["daily", "weekly", "monthly", "yearly"],
  "salesValues": { "daily": 50000 },
  "monthlyExpensesMmk": 200000,
  "competitorDetails": [
    { "name": "string", "tier": "discount" | "matcher" | "premium", "audience": "string" }
  ],
  "customersSeed": ["string", "..."],
  "productsSeed": [{ "name": "string", "priceMmk": 2000 }],
  "suppliersSeed": [{ "name": "string", "supplies": "string" }]
}
```

**Caps:** `competitors ≤10`, `competitorDetails ≤10`, `customersSeed ≤50`, `productsSeed ≤50`, `suppliersSeed ≤30`, `salesPeriods` keys are an enum.

**Response 200:** the full updated profile (same shape as GET).

---

### 4.7 Voice

#### `POST /api/mobile/v1/voice/upload`

Multipart upload of a recorded audio file. Backend transcribes via Gemini + extracts facts in one pass.

**Request (multipart/form-data):**
- `audio` — audio file blob (m4a/wav, ≤10 MB)
- `durationSecs` — string, integer seconds

**Response 200:**
```json
{
  "recordingId": "vrec_<cuid>",
  "transcript": "ဒီနေ့ မုန့်ဟင်းခါး ၂ ပွဲ ရောင်းရတယ်...",
  "facts": [
    {
      "kind": "sale",
      "amountMmk": 6000,
      "description": "မုန့်ဟင်းခါး ၂ ပွဲ",
      "counterparty": "ကိုအောင်"
    }
    // 0..N draft facts
  ]
}
```

**Notes:**
- Returns *draft* facts; client must follow up with `POST /facts/confirm` to persist.
- Server-side cap and timeout suitable for Gemini transcription + extraction (~30–60s).

---

### 4.8 Facts

#### `POST /api/mobile/v1/facts/confirm`

Bulk-insert user-confirmed (and possibly edited) facts.

**Request body:**
```json
{
  "recordingId": "vrec_<cuid> | null (optional — links facts to a voice recording)",
  "facts": [
    {
      "kind": "sale" | "expense" | "receivable" | "note",
      "amountMmk": 6000,
      "description": "string (required, 1..200)",
      "counterparty": "string (optional)"
    }
  ]
}
```

`facts` must contain ≥1 entry. Each fact's `description` is required.

**Response 200:**
```json
{ "saved": 4 }
```

Triggers a background insights regen.

#### `DELETE /api/mobile/v1/facts/[id]`

Delete a single fact. Scoped to the caller's workspace — silently no-ops if the fact doesn't belong to the user.

**Response 200:** `{ "deleted": true }`

Triggers a background insights regen.

---

### 4.9 Sales import

#### `POST /api/mobile/v1/sales/import/preview`

Multipart Excel upload. Backend parses with `xlsx` + asks Gemini to identify column roles. Returns the full row matrix + an auto-suggested mapping for the user to confirm.

**Request (multipart/form-data):**
- `file` — `.xlsx` or `.xls` (≤5 MB)

**Response 200:**
```json
{
  "headers": ["ရက်စွဲ", "ဖောက်သည် နာမည်", "ပစ္စည်း", "အရေအတွက်", "စျေး (ကျပ်)"],
  "sampleRows": [
    ["2026-05-15", "ကိုအောင်", "မုန့်ဟင်းခါး", 2, 6000]
    // first 8 rows
  ],
  "rows": [ /* every row */ ],
  "mapping": {
    "date":     0,
    "customer": 1,
    "amount":   4,
    "product":  2,
    "quantity": 3
  },
  "totalRows": 86
}
```

`mapping` integers are 0-based column indices. `-1` means the LLM didn't find that role.

**Notes:**
- Cap: 5 MB file.
- 300s `maxDuration`.
- Mobile timeout: 240s.

#### `POST /api/mobile/v1/sales/import/confirm`

Apply the (possibly user-edited) mapping to the row matrix and bulk-insert facts (all as `kind: "sale"`).

**Request body:**
```json
{
  "headers": [...],
  "rows":    [[...], [...]],
  "mapping": {
    "date":     0,
    "customer": 1,
    "amount":   4,
    "product":  2,
    "quantity": 3
  }
}
```

Rows lacking both a usable `amount` and a `date` are silently dropped.

**Response 200:**
```json
{ "inserted": 84 }
```

Triggers a background insights regen.

#### `POST /api/mobile/v1/sales/import/text`

Free-text ledger paste. LLM extracts facts (sale / expense / receivable / note) and bulk-inserts. Same pipeline as voice extraction.

**Request body:**
```json
{ "text": "<10..10000 chars of Burmese/English/numeric ledger>" }
```

**Response 200:**
```json
{ "inserted": 26 }
```

If no extractable facts: `{ "inserted": 0, "error": "No facts found in text" }` with HTTP 200.

**Notes:**
- 300s `maxDuration`.
- Mobile timeout: 240s.
- Triggers a background insights regen.

---

### 4.10 Products import

#### `POST /api/mobile/v1/products/import/file`

Multipart Excel or PDF. Backend flattens to text (xlsx → cell-per-line, pdf → `pdf-parse`) then asks Gemini for a product list.

**Request (multipart/form-data):**
- `file` — `.xlsx`, `.xls`, or `.pdf` (≤5 MB)

**Response 200:**
```json
{
  "products": [
    { "name": "မုန့်ဟင်းခါး", "priceMmk": 2000 },
    { "name": "ကော်ဖီ", "priceMmk": 1500 },
    { "name": "ကိတ်မုန့်" }
  ]
}
```

#### `POST /api/mobile/v1/products/import/text`

Free-text product list paste.

**Request body:**
```json
{ "text": "<3..20000 chars>" }
```

**Response 200:** same shape as the file route — `{ "products": [...] }`.

**Both routes:**
- Return an extracted list. **No save side-effect.** The client merges the list into `productsSeed` and calls `PUT /profile` to persist.
- LLM dedupes by case-insensitive name, caps 50 products.
- 300s `maxDuration`.
- Mobile timeout: 240s.

---

## 5. Supabase Edge Function — `gemini-proxy`

**URL:** `https://juzwfcyattvvpitlkhes.supabase.co/functions/v1/gemini-proxy/<gemini-path>`

The Strivo Next.js backend optionally routes every Gemini API call through this Deno-based Supabase Edge Function so the request goes through Supabase's edge network (reliably reachable from Myanmar).

**Behavior:** verbatim pass-through to `https://generativelanguage.googleapis.com<gemini-path>`. The function:
1. Strips inbound `authorization` and `x-goog-*` headers.
2. Injects the real `GEMINI_API_KEY` from the function secret.
3. Forwards method + body, returns status + body.

**Enable / disable:** controlled by `GEMINI_PROXY_URL` env var on the backend. When unset, the SDK calls Google directly. When set, every Gemini call hops through Supabase.

**Smoke test:**
```bash
curl -X POST "https://juzwfcyattvvpitlkhes.supabase.co/functions/v1/gemini-proxy/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "content-type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Reply with ok"}]}]}'
```

Watch live logs:
```bash
supabase functions logs gemini-proxy --tail
```

---

## 6. Shared schemas

### 6.1 `StrategicInsights`

Returned inside `/insights` `{ ready: true, insights: ... }`.

```ts
interface StrategicInsights {
  metrics: BusinessMetrics
  headline: string                      // one-sentence diagnosis (Burmese)
  growthScore: number                   // 0..100
  marketScore: number                   // 0..100
  riskLevel: "low" | "medium" | "high"
  riskReason: string                    // Burmese
  swot: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    threats: string[]
  }
  forecastNote: string                  // Burmese
  recommendations: {
    promotion: Recommendation
    stock: Recommendation
    pricing: Recommendation
    growth: Recommendation
  }
}

interface Recommendation {
  title: string                         // Burmese
  advice: string                        // Burmese, ≤2 sentences
  steps: string[]                       // 3 numbered action items, Burmese
}
```

### 6.2 `BusinessMetrics`

Deterministic, server-computed before the LLM reasons.

```ts
interface BusinessMetrics {
  periodDays: number                    // typically 30
  totalSalesMmk: number
  totalExpensesMmk: number
  netProfitMmk: number
  profitMarginPct: number
  salesTrendPct: number                 // recent half vs prior half
  avgDailySalesMmk: number
  txCount: number
  outstandingReceivablesMmk: number
  topCustomers: { name: string, totalMmk: number, count: number }[]
  customerConcentrationPct: number      // top customer share of sales
  expenseRatioPct: number
  dailySeries: { date: string, salesMmk: number, expensesMmk: number }[]
  salesForecast: number[]               // projected daily sales, next 7 days
  customerSegments: {
    key: "loyal" | "occasional" | "oneTime" | "walkIn"
    customers: number
    totalMmk: number
  }[]
}
```

### 6.3 Fact kinds

```ts
type FactKind = "sale" | "expense" | "receivable" | "note"
```

### 6.4 Sales period enum

```ts
type SalesPeriod = "daily" | "weekly" | "monthly" | "yearly"
```

### 6.5 Competitor tier enum

```ts
type RivalTier = "discount" | "matcher" | "premium"
```

### 6.6 Business type enum

```ts
type BusinessType = "retail" | "fnb" | "services" | "b2b_trading" | "other"
```

---

## Appendix — endpoint summary table

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/mobile/v1/auth/sync` | Provision user + workspace |
| GET  | `/api/mobile/v1/home` | Today + week + month rollups + recent entries |
| GET  | `/api/mobile/v1/reports` | Week strip + month totals + top customers + categories + receivables |
| GET  | `/api/mobile/v1/analytics` | Internal aggregate (kind breakdown + recent) |
| GET  | `/api/mobile/v1/insights` | Cached or freshly-generated StrategicInsights |
| GET  | `/api/mobile/v1/profile` | Business profile + seed lists |
| PUT  | `/api/mobile/v1/profile` | Partial update of any profile field |
| POST | `/api/mobile/v1/voice/upload` | Multipart audio → transcript + draft facts |
| POST | `/api/mobile/v1/facts/confirm` | Bulk-insert confirmed facts |
| DELETE | `/api/mobile/v1/facts/[id]` | Delete a single fact (workspace-scoped) |
| POST | `/api/mobile/v1/sales/import/preview` | Multipart XLSX → headers + rows + LLM column mapping |
| POST | `/api/mobile/v1/sales/import/confirm` | Apply mapping → bulk-insert sales facts |
| POST | `/api/mobile/v1/sales/import/text` | Pasted ledger text → LLM extract → bulk insert |
| POST | `/api/mobile/v1/products/import/file` | Multipart XLSX/PDF → product catalogue list |
| POST | `/api/mobile/v1/products/import/text` | Pasted text → product catalogue list |

---

End of API Reference v1.
