# Strivo — Tech Stack & Architecture

> AI-powered business assistant for Myanmar MSMEs (micro, small & medium enterprises).
> Burmese-first. Owners log sales/expenses by Excel, text, or manual entry; the app
> turns raw transactions into financial reports and AI strategic insights.
>
> **Host: Vercel, region `pdx1` (us-west-2)** — pinned in `vercel.json`, colocated
> with the Supabase Postgres project (us-west-2). API handlers make several
> sequential DB round-trips per request, so compute lives next to the DB, not the
> user. If the DB ever migrates to ap-southeast-1, switch the pin to `sin1`.
> Required env vars: see `.env.example`.

---

## 1. High-Level Overview

Strivo is a **single Next.js app** that serves both the responsive web UI and its API:

1. **Web app** (Next.js App Router + React DOM) — the responsive, Burmese-first
   interface a shop owner uses. Mobile-first: a centered phone-width column on
   desktop, full-bleed on phones.
2. **API** (Next.js Route Handlers under `/api/mobile/v1/*`) — auth, data, and AI
   orchestration, served same-origin to the web app.

Plus two managed cloud services: **Supabase** (auth + Postgres + edge functions) and **Google Gemini** (LLM).

> The UI began as an Expo / React Native app and was ported to plain web via a
> small React-Native-compatibility layer (`src/rn/`) that renders real DOM nodes
> (View→div, Text→span, StyleSheet→inline CSS, LinearGradient→CSS gradients).
> No react-native-web — the runtime is 100% React DOM.

```
┌─────────────────────┐         ┌──────────────────────────┐
│   Web App            │  fetch  │   API Route Handlers      │
│   (Next.js + DOM)    │ ──────▶ │   (/api/mobile/v1/*)      │
│   src/rn compat layer│ ◀────── │   same origin             │
│  • Zustand (client)  │  JSON   │  • Drizzle ORM            │
│  • React Query (srv) │         │  • Zod validation         │
│  • next/navigation   │         │  • LLM orchestration      │
└─────────┬───────────┘         └──────┬──────────┬─────────┘
          │                            │          │
          │ Supabase Auth SDK          │          │ Gemini calls
          ▼                            ▼          ▼
┌─────────────────────┐    ┌──────────────┐  ┌──────────────────┐
│  Supabase Auth       │    │ Supabase PG  │  │ Supabase Edge Fn │
│  (Google + email)    │    │ (Drizzle)    │  │  gemini-proxy    │
└─────────────────────┘    └──────────────┘  └────────┬─────────┘
                                                        │ key rotation
                                                        ▼
                                              ┌──────────────────┐
                                              │  Google Gemini    │
                                              │  2.5 Flash        │
                                              └──────────────────┘
```

---

## 2. Tech Stack

### Web App (`src/app`, `src/components`, `src/rn`)

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | **Next.js** | 16 | App Router (frontend + API), Turbopack |
| Runtime | **React** (DOM) | 19 | Component model, client components |
| RN compat | **`src/rn/`** (in-house) | — | View/Text/Pressable/StyleSheet/LinearGradient → DOM; expo-router & expo-* shims |
| Navigation | **next/navigation** | (Next 16) | App-Router routing; `src/rn/router` maps the old expo-router API onto it |
| Client state | **Zustand** | 5 | Onboarding draft, profile flags (persisted to localStorage) |
| Server state | **TanStack React Query** | 5 | Data fetching, caching, invalidation |
| Auth client | **@supabase/supabase-js** | 2 | Google OAuth + email/password (browser, localStorage session) |
| Icons | **lucide-react** | — | Outline icon set (+ inline Google mark) |
| Fonts | **next/font**: Inter, Instrument Serif, JetBrains Mono, **Noto Sans Myanmar** | — | Burmese + Latin type, self-hosted, CSS-variable stacks |
| Files | hidden `<input type=file>` + object URLs (`src/rn/expo`) | — | Excel/PDF upload, JSON export download |
| Spreadsheet | **xlsx** (SheetJS) | 0.18 | Server-side Excel parse |

### Backend (`src/app/api`, `src/db`, `src/lib`)

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | **Next.js** | 16.2.6 | Route Handlers (App Router), Turbopack |
| Runtime | **React** | 19 | Server components |
| ORM | **Drizzle ORM** | 0.45 | Type-safe SQL, migrations |
| DB driver | **postgres** (postgres.js) | 3.4 | Supabase Postgres via Supavisor poolers (txn 6543 runtime / session 5432 migrations) |
| Validation | **Zod** | 4 | Request body + LLM output schemas |
| LLM SDK | **@google/genai** | 2.6 | Gemini 2.5 Flash calls |
| Auth (server) | **@supabase/supabase-js** | 2 | JWT verification, admin API |

### Cloud Services

| Service | Role |
|---|---|
| **Supabase Postgres** | Managed Postgres (us-west-2), RLS workspace isolation, Supavisor pooling |
| **Supabase Auth** | Identity — Google OAuth + email/password, JWT issuance |
| **Supabase Edge Functions** | `gemini-proxy` — Deno function that routes Gemini calls with multi-key rotation + failover |
| **Google Gemini 2.5 Flash** | Fact extraction, financial insights, scenario projection |

---

## 3. Architecture Detail

### 3.1 Multi-tenant data model

One **user** owns one **workspace**; all business data hangs off the workspace.

```
users (id = Supabase auth uid, email)
  └─ workspaces (owner_id, name, business profile, seed lists, cached insights)
       ├─ facts (kind: sale | expense | receivable | note; amount, description, category, occurredAt)
       └─ voice_recordings (legacy; voice capture removed from UI)
```

**Active tables:** `users`, `workspaces`, `facts`, `voice_recordings`.
*(The schema also carries dormant "founder graph" tables — `entities`, `edges`, `mentions`, `branches`, `commits`, `simulations`, `agents`, `materials` — not used by the Strivo product.)*

Key columns on `facts`:
- `kind` — drives all home/report aggregation
- `category` — optional expense bucket (e.g. ဆိုင်ခ, လုပ်ခ) for expense breakdown
- `occurredAt` — the business date (not insert time), so imports of historical ledgers report correctly

**Isolation:** every API route resolves the Supabase user → workspace, then filters every query by `workspace_id`. (A planned RLS layer adds Postgres-level defense-in-depth via a session variable.)

### 3.2 Auth flow

```
1. Web: supabase.auth.signInWithOAuth (full-page Google redirect) / signInWithPassword
2. Supabase issues a JWT, persisted in localStorage; detectSessionInUrl finishes OAuth
3. Web: POST /api/mobile/v1/auth/sync with Bearer JWT (same origin)
4. Backend verifies JWT, getOrCreateMobileWorkspace(user)
5. Returns { workspace, onboarded } — onboarded=true if profile fields exist
6. Web hydrates Zustand + prefetches home/profile, then the AuthGate routes:
     onboarded=false → onboarding wizard (10 steps)
     onboarded=true  → app tabs
```

Session persistence means a returning user skips login; the `onboarded` flag decides wizard vs. app. `src/components/app/AuthGate.tsx` is the client-side route guard (the web equivalent of the old expo-router root navigator) and shows a loading screen while auth resolves and tab data prefetches. `*_AUTH_BYPASS=true` short-circuits the guard with a stub dev user for local work.

### 3.3 Data ingestion (3 paths)

All paths converge on `facts` rows.

| Path | Flow |
|---|---|
| **Excel import** | Client picks file → `xlsx` parses → POST rows to `/import/preview` → Gemini detects column mapping → user confirms → `/import/confirm` batch-inserts |
| **Text import** | User pastes a ledger / SMS → `/import/text` → Gemini `extractFacts()` returns structured rows → inserted |
| **Manual entry** | Single form → `/facts/confirm` |

Sales, expenses, and products each have their own import routes following this shape.

### 3.4 AI orchestration

```
Backend route  ──▶  getLLM() → GeminiProvider
                         │
                         │ httpOptions.baseUrl = Supabase Edge Function URL
                         │ httpOptions.headers = Authorization: Bearer <anon key>
                         ▼
              Supabase Edge: gemini-proxy (Deno)
                         │  rotates GEMINI_API_KEYS, fails over on
                         │  429/403/400-key-invalid, falls back to caller key
                         ▼
                 Google Gemini 2.5 Flash
```

**Why the proxy?** Google's Generative Language API is unreliable from inside Myanmar. Routing through Supabase's global edge gives a stable path, plus multi-key rotation stacks free-tier quotas.

**Resilience built into `GeminiProvider`:**
- Lenient JSON parser — repairs trailing commas, smart quotes, and recovers truncated output (keeps the rows the model finished)
- Retry with exponential backoff + jitter (3 tries, capped under the mobile 60s iOS request timeout)
- Schema re-validation via Zod with a correction retry
- In-memory scenario cache (30 min TTL) to avoid duplicate calls

**AI features:**
- `extractFacts` — Burmese transcript/ledger → structured facts
- `/insights` — full strategic report (growth/market scores, SWOT, segments, recommendations)
- `/insights/scenario` — what-if projection grounded in the cached report

### 3.5 Navigation structure (Next App Router)

```
/login                 → login screen (Strivo brand, Google + email)
/onboarding[/...]      → 10-step wizard (name, type, sales, expenses, competitors, …)
(tabs) group           → shares the FloatingDock chrome
  ├─ /                 → Home (hero metric, daily summary, recent entries)
  ├─ /reports          → Financial report (P&L, category + expense breakdown)
  ├─ /analytics        → AI insights overview
  │    └─ /analytics/{trend,swot,segments,scenarios,recommendations}
  └─ /profile          → Business profile + data import + account
detail routes (no dock)→ /record (add-data hub), /manual-entry, /import-{sales,expenses,products},
                         /business-profile, /confirm-facts
```

The `(tabs)` route-group layout renders the FloatingDock; the analytics detail
screens live under it but use their own back header. Stack-style detail routes sit
outside the group so they render without the dock. The dock's center "+" opens the
Add-data hub (`/record`).

---

## 4. Key Design Decisions

| Decision | Rationale |
|---|---|
| **Gemini 2.5 Flash over GPT-4/Claude** | 50–100× cheaper per token; sufficient for Burmese extraction + reasoning |
| **Supabase edge proxy for AI** | Network reliability from Myanmar + free-tier quota stacking via key rotation |
| **Supabase Postgres (consolidated)** | One vendor for auth + DB + edge functions; RLS workspace isolation enforced in-database via the `strivo_app` NOBYPASSRLS role |
| **Burmese-first UI** | Target users are Myanmar shop owners; Noto Sans Myanmar with line-height tuning |
| **occurredAt vs createdAt** | Historical ledger imports must report on the business date, not the insert date |
| **Lenient JSON + retry budget** | LLM output is non-deterministic; recover partials instead of failing the whole request |
| **Zustand + React Query split** | Client UI state (onboarding draft) vs. server cache (home/reports/insights) |

---

## 5. Environments & Config

**Server (`.env.local` — canonical list in `.env.example`):**
```
DATABASE_URL                        # Supabase Postgres (Supavisor txn pooler :6543)
SUPABASE_URL / SUPABASE_ANON_KEY    # JWT verify + proxy auth
SUPABASE_SERVICE_ROLE_KEY           # admin scripts only, never app runtime
GEMINI_API_KEY                      # caller-key fallback
GEMINI_PROXY_URL                    # Supabase edge function URL (optional)
SENTRY_DSN                          # server error reporting (optional; unset = no-op)
```

**Browser (same `.env.local`, exposed via `NEXT_PUBLIC_`):**
```
NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY   # browser Supabase client
```

Real Supabase auth is always enforced — there is no bypass.

**Edge function secrets:**
```
GEMINI_API_KEYS                     # comma-separated, rotated
```

---

## 6. Cost Profile (serverless, scales with usage)

| Users | Vercel | Supabase (auth+DB+edge) | Gemini | Total/mo |
|---|---|---|---|---|
| 100 | $0 | $0 | $1–3 | **$1–3** |
| 1,000 | $20 | $25 | $10–30 | **$55–75** |
| 10,000 | $20–50 | $25–100+ | $100–300 | **$145–450** |

~$0.02 AI cost per active user/month. Free tiers cover the first ~100 users at near-zero.

---

*Stack verified against `package.json`, `src/db/schema.ts`, and the API routes as of this writing.*
