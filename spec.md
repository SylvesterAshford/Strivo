# Strivo — Product & Technical Specification

Scope: the Strivo web application (`lattice/`). The marketing site
(`lattice-landing/`) is out of scope here. Pair this with `ARCHITECTURE.md`
(system design), `DESIGN.md` (design system), and `businesslogic.md` (domain rules).

---

## 1. Overview

A single Next.js 16 app serving both the responsive web UI and its JSON API.

- **Frontend:** Next.js App Router + React 19 (DOM). The UI was ported from an Expo
  app via a React-Native→DOM compatibility layer (`src/rn/`), so screens render real
  DOM, not react-native-web.
- **API:** Route Handlers under `/api/mobile/v1/*`, same-origin. (The `mobile`
  segment is a historical name; the routes serve the web app.)
- **Cloud:** Supabase (auth + edge functions), Neon (Postgres), Google Gemini 2.5
  Flash (LLM).

## 2. Users & roles

- **Shop owner (only end-user role).** One Supabase identity ↔ one workspace ↔ all
  business data. No multi-user/team roles in v1.
- **Dev user.** When `AUTH_BYPASS` is on, the API resolves a stub `dev_local_user`
  with its own workspace — for local development and demos without Supabase.

There is no admin UI; operational tasks run via `scripts/`.

## 3. Functional scope

### 3.1 Authentication & onboarding
- Sign in with Google (full-page OAuth redirect) or email/password (Supabase).
- First sign-in provisions a `users` row + a `workspaces` row.
- A returning user skips login (persisted session). The `onboarded` flag decides
  wizard vs. app.
- **Onboarding wizard (10 steps):** business name/type/product → sales periods →
  sales values → expenses (+ categories) → competitors → rival details → customers
  → products → suppliers → optional bulk sales import. Optimistic completion: the
  wizard flips `onboarded` immediately and saves the profile in the background.

### 3.2 Data entry (three paths, all converge on `facts`)
| Path | Flow |
|---|---|
| Excel/CSV import | upload file → backend parses (SheetJS) → Gemini detects column mapping → user confirms/edits → bulk insert |
| Text paste | paste a ledger / SMS → Gemini extracts structured facts → bulk insert |
| Manual entry | one form (kind, description, amount, counterparty, expense category) → insert |

Sales, expenses, and products each have their own import routes following this shape.

### 3.3 Home (dashboard)
- Greeting + date header; profile-completeness nudge.
- Hero metric (configurable: today sales / week / month / outstanding) with an
  animated count-up.
- KPI tile row: week sales, month revenue, outstanding.
- Daily summary line with day-over-day delta; alert chips (outstanding, expense >
  sales).
- Recent entries (today, or most-recent fallback), swipe/tap to delete.
- Cold-start state when the workspace has no activity.

### 3.4 Reports
- 7-day sales/expense bar strip.
- Calendar-month totals (sales, expenses, net).
- Category breakdown (by fact kind) and expense-category breakdown.
- Top 5 customers (this month, by sales).
- Outstanding receivables list.

### 3.5 Analytics (AI)
- Generate-on-demand strategic report: headline, growth score, market score, risk
  level + reason, SWOT, customer segments, 7-day forecast, four recommendations
  (promotion, stock, pricing, growth). Cached per workspace.
- Detail sub-screens: trend, SWOT, segments, recommendations.
- What-if scenario explorer: templates + free-text; returns headline, estimated
  sales/margin impact, risk, watch-fors, steps, caveats.

### 3.6 Profile & account
- View/edit the full business profile (name, type, product, location, target,
  challenge, budget, competitors, customers, suppliers, products, expense categories).
- Export all data as JSON (browser download).
- Delete account (cascades server-side).
- Sign out.

## 4. Routes (App Router)

```
/login                                   auth
/onboarding[/periods|sales-values|expenses|competitors|
            rival-details|customers|products|suppliers|bulk-import]
(tabs) group — shares the FloatingDock / sidebar chrome:
  /                                      Home dashboard
  /reports
  /analytics  [/trend|swot|segments|scenarios|recommendations]
  /profile
detail routes (no dock):
  /record (add-data hub), /manual-entry,
  /import-sales, /import-expenses, /import-products,
  /business-profile, /confirm-facts
/api/mobile/v1/*                          JSON API (see §6)
```

## 5. Data model (Drizzle / Postgres)

Active tables: `users`, `workspaces`, `facts`, `voice_recordings` (legacy, unused
by the UI). The schema also carries dormant "founder graph" tables not used by the
product.

```
users (id = Supabase uid, email)
  └─ workspaces (owner_id, name, business profile fields, seed lists, cached insights)
       └─ facts (kind, amountMmk, description, category, counterparty, occurredAt)
```

`facts.kind` ∈ {`sale`, `expense`, `receivable`, `note`}. `amountMmk` is an integer
(MMK, no decimals). `occurredAt` is the **business date** (not insert time) so
historical imports report correctly. `category` is the expense bucket; `counterparty`
is the customer/supplier name.

Isolation: every request resolves user→workspace and filters by `workspace_id`. A
Postgres RLS layer enforces per-workspace isolation via `app.user_id` /
`app.workspace_id` session variables set inside each request transaction.

## 6. API surface (`/api/mobile/v1/*`)

| Method · Path | Purpose |
|---|---|
| POST `/auth/sync` | resolve/create workspace, return `{ workspace, onboarded }` |
| GET·PUT `/profile` | read / update business profile |
| GET `/home` | today/week/month/outstanding + recent entries |
| GET `/reports` | week strip, month totals, top customers, categories, receivables |
| GET `/analytics` | kind breakdown, top counterparties, recent |
| GET `/insights` | cached strategic report (generates on cold start) |
| POST `/insights/scenario` | run a what-if scenario |
| POST `/facts/confirm` · DELETE `/facts/[id]` | save confirmed facts / delete one |
| POST `/sales/import/preview·confirm·text` | Excel preview + confirm, text extract |
| POST `/expenses/import/preview·confirm·text` | same for expenses |
| POST `/products/import/file·text` | extract product catalogue |
| GET `/users/me/export` · DELETE `/users/me` | export JSON / delete account |
| POST `/voice/upload` | (legacy) audio → transcript + facts |

All reads require a valid bearer JWT (or `AUTH_BYPASS`). Request bodies and LLM
outputs are validated with Zod.

## 7. AI pipeline

`getLLM()` → `GeminiProvider` → Supabase edge function `gemini-proxy` → Gemini 2.5
Flash. The proxy rotates a pool of keys and fails over (429/403/invalid-key),
falling back to the caller's key. Routing through Supabase's edge gives a stable
path from Myanmar. Resilience: lenient JSON parse (repairs trailing commas, smart
quotes, truncation), exponential-backoff retries, Zod re-validation, and a 30-minute
scenario cache. AI features: `extractFacts` (Burmese ledger → structured facts),
`/insights` (strategic report), `/insights/scenario` (what-if).

## 8. Non-functional requirements

- **i18n:** Burmese-primary copy in `src/i18n/my.ts`; English only for mono eyebrows,
  MMK, and day labels. Arabic numerals throughout. Noto Sans Myanmar fallback in
  every font stack.
- **Performance:** React Query stale-while-revalidate (60s stale, 24h gc, retry 2);
  Neon round-trip is the main latency (cold start can be several seconds on first
  call). LLM endpoints use 120-240s client timeouts.
- **Responsive:** desktop (≥1024px) = sidebar + wide content grid; mobile = single
  column + bottom dock. Content centers within `--content-max`.
- **Accessibility:** body/labels ≥ 4.5:1 contrast; visible `:focus-visible` rings;
  keyboard-activatable controls; `<main>` + labelled `nav` landmarks; ≥44px touch
  targets.
- **Motion:** entrance + hierarchy only (count-up, hover-lift, bar grow, fade-up);
  all disabled under `prefers-reduced-motion`.
- **Security:** per-workspace RLS; service-role key server-only; secrets via env;
  bearer JWT validated server-side; `AUTH_BYPASS` defaults to false in production
  (both server and client).

## 9. Environment & config

Server: `DATABASE_URL` / `DATABASE_URL_OWNER`, `SUPABASE_URL` / `SUPABASE_ANON_KEY`
/ `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_BYPASS`, `GEMINI_API_KEY`, `GEMINI_PROXY_URL`.
Browser (`NEXT_PUBLIC_*`): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `AUTH_BYPASS`,
`APP_URL`. See `.env.example`. Edge function secret: `GEMINI_API_KEYS`
(comma-separated, rotated).

## 10. Testing

Vitest (happy-dom). Current coverage: `resolveStyle` (the RN→CSS converter,
including the line-height regression), `formatCurrency` (MMK thresholds incl.
crore), `decideRedirect` (auth-gate matrix), and the LLM provider. E2E/integration
for the auth + import journeys is captured in `TODOS.md`.

## 11. Out of scope (v1)

Multi-user teams/roles · in-app payments/billing · native mobile apps (web only) ·
real-time collaboration · offline write queue · voice capture UI (API stub exists) ·
admin dashboard · the dormant "founder graph" schema.
