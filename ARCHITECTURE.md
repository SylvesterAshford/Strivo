# Strivo — Tech Stack & Architecture

> AI-powered business assistant for Myanmar MSMEs (micro, small & medium enterprises).
> Burmese-first. Owners log sales/expenses by Excel, text, or manual entry; the app
> turns raw transactions into financial reports and AI strategic insights.

---

## 1. High-Level Overview

Strivo is a **two-part system**:

1. **Mobile app** (Expo / React Native) — what the shop owner uses.
2. **Backend API** (Next.js) — auth, data, and AI orchestration.

Plus three managed cloud services: **Supabase** (auth + edge functions), **Neon** (Postgres), and **Google Gemini** (LLM).

```
┌─────────────────────┐         ┌──────────────────────────┐
│   Mobile App         │  HTTPS  │   Next.js Backend         │
│   (Expo / RN)        │ ──────▶ │   (mobile API routes)     │
│                      │ ◀────── │                           │
│  • Zustand (client)  │  JSON   │  • Drizzle ORM            │
│  • React Query (srv) │         │  • Zod validation         │
│  • expo-router       │         │  • LLM orchestration      │
└─────────┬───────────┘         └──────┬──────────┬─────────┘
          │                            │          │
          │ Supabase Auth SDK          │          │ Gemini calls
          ▼                            ▼          ▼
┌─────────────────────┐    ┌──────────────┐  ┌──────────────────┐
│  Supabase Auth       │    │ Neon Postgres│  │ Supabase Edge Fn │
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

### Mobile App (`/mobile`)

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | **Expo** | SDK 56 | React Native tooling, OTA, builds |
| Runtime | **React Native** | 0.85.3 | Native iOS/Android UI |
| UI | **React** | 19 | Component model |
| Navigation | **expo-router** | 56 | File-based routing, tabs + stacks |
| Client state | **Zustand** | 5 | Onboarding draft, profile flags |
| Server state | **TanStack React Query** | 5 | Data fetching, caching, invalidation |
| Auth client | **@supabase/supabase-js** | 2 | Google OAuth + email/password |
| Animation | **react-native-reanimated** | 4 | Gestures, transitions |
| Gestures | **react-native-gesture-handler** | 2 | Swipe-to-delete, dock |
| Icons | **@tabler/icons-react-native** | 3 | Outline icon set |
| Fonts | Inter, Instrument Serif, JetBrains Mono, **Noto Sans Myanmar** | — | Burmese + Latin type |
| Files | **expo-document-picker**, **expo-file-system**, **expo-sharing** | 56 | Excel/PDF upload, data export |
| Spreadsheet | **xlsx** (SheetJS) | 0.18 | Client-side Excel parse preview |
| Secure storage | **expo-secure-store** | 56 | Session token persistence |

### Backend (`/` root — Next.js)

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | **Next.js** | 16.2.6 | API routes (App Router), Turbopack |
| Runtime | **React** | 19 | (server components, minimal UI) |
| ORM | **Drizzle ORM** | 0.45 | Type-safe SQL, migrations |
| DB driver | **postgres** (postgres.js) | 3.4 | Neon connection |
| Validation | **Zod** | 4 | Request body + LLM output schemas |
| LLM SDK | **@google/genai** | 2.6 | Gemini 2.5 Flash calls |
| Auth (server) | **@supabase/supabase-js** | 2 | JWT verification, admin API |

### Cloud Services

| Service | Role |
|---|---|
| **Neon** | Serverless Postgres (auto-suspend, branching) |
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
*(The schema also carries dormant "founder graph" tables — `entities`, `edges`, `mentions`, `branches`, `commits`, `simulations`, `agents`, `materials` — not used by the mobile product.)*

Key columns on `facts`:
- `kind` — drives all home/report aggregation
- `category` — optional expense bucket (e.g. ဆိုင်ခ, လုပ်ခ) for expense breakdown
- `occurredAt` — the business date (not insert time), so imports of historical ledgers report correctly

**Isolation:** every API route resolves the Supabase user → workspace, then filters every query by `workspace_id`. (A planned RLS layer adds Postgres-level defense-in-depth via a session variable.)

### 3.2 Auth flow

```
1. Mobile: supabase.auth.signInWithOAuth / signInWithPassword
2. Supabase issues a JWT, persisted in expo-secure-store
3. Mobile: POST /api/mobile/v1/auth/sync with Bearer JWT
4. Backend verifies JWT, getOrCreateMobileWorkspace(user)
5. Returns { workspace, onboarded } — onboarded=true if profile fields exist
6. Mobile hydrates Zustand + prefetches home/profile, then routes:
     onboarded=false → onboarding wizard (10 steps)
     onboarded=true  → app tabs
```

Session persistence means a returning user skips login; the `onboarded` flag decides wizard vs. app. A loading screen gates the transition while auth resolves and tab data prefetches.

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

### 3.5 Mobile navigation structure

```
(auth)                 → login screen (Strivo brand, Google + email)
(onboarding)           → 10-step wizard (name, type, sales, expenses, competitors, …)
(app)                  → Stack
  ├─ (tabs)            → Tabs + FloatingDock
  │    ├─ index        → Home (hero metric, daily summary, recent entries)
  │    ├─ reports      → Financial report (P&L, category + expense breakdown)
  │    ├─ analytics    → AI insights (trend, SWOT, segments, scenarios)
  │    └─ profile      → Business profile + data import + account
  └─ detail screens    → record (add-data hub), manual-entry, import-*, business-profile, confirm-facts
```

Detail screens push **over** the tabs (so back returns to the originating tab); the FloatingDock's center "+" opens the Add-data hub.

---

## 4. Key Design Decisions

| Decision | Rationale |
|---|---|
| **Gemini 2.5 Flash over GPT-4/Claude** | 50–100× cheaper per token; sufficient for Burmese extraction + reasoning |
| **Supabase edge proxy for AI** | Network reliability from Myanmar + free-tier quota stacking via key rotation |
| **Neon over Supabase Postgres** | Serverless auto-suspend (no idle billing), DB branching for safe migrations |
| **Burmese-first UI** | Target users are Myanmar shop owners; Noto Sans Myanmar with line-height tuning |
| **occurredAt vs createdAt** | Historical ledger imports must report on the business date, not the insert date |
| **Lenient JSON + retry budget** | LLM output is non-deterministic; recover partials instead of failing the whole request |
| **Zustand + React Query split** | Client UI state (onboarding draft) vs. server cache (home/reports/insights) |

---

## 5. Environments & Config

**Backend (`.env.local`):**
```
DATABASE_URL / DATABASE_URL_OWNER   # Neon connection
SUPABASE_URL / SUPABASE_ANON_KEY    # JWT verify + proxy auth
SUPABASE_SERVICE_ROLE_KEY           # admin (account delete, seeding)
GEMINI_API_KEY                      # caller-key fallback
GEMINI_PROXY_URL                    # Supabase edge function URL
```

**Mobile (`mobile/.env`):**
```
EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY
EXPO_PUBLIC_API_BASE_URL            # backend base (LAN IP in dev)
EXPO_PUBLIC_AUTH_BYPASS             # dev shortcut (false in prod)
```

**Edge function secrets:**
```
GEMINI_API_KEYS                     # comma-separated, rotated
```

---

## 6. Cost Profile (serverless, scales with usage)

| Users | Vercel | Neon | Supabase | Gemini | Total/mo |
|---|---|---|---|---|---|
| 100 | $0 | $0 | $0 | $1–3 | **$1–3** |
| 1,000 | $20 | $19 | $25 | $10–30 | **$74–94** |
| 10,000 | $20–50 | $69–150 | $25–100 | $100–300 | **$214–600** |

~$0.02 AI cost per active user/month. Free tiers cover the first ~100 users at near-zero.

---

*Stack verified against `package.json`, `mobile/package.json`, `src/db/schema.ts`, and the mobile API routes as of this writing.*
