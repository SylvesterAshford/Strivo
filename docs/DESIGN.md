# Strivo — Design Document (v1)

**Codebase:** Lattice • **Status:** v1 in active development • **Last updated:** 2026-05-28

This document specifies *how the app looks and works*. The PRD (`PRD.md`) covers *what* and *why*.

---

## Table of contents

- Part 1 — Visual language ("Plum Linen")
- Part 2 — Typography
- Part 3 — Spacing and radius
- Part 4 — Iconography
- Part 5 — Screen architecture
- Part 6 — Component library
- Part 7 — Burmese script rendering rules
- Part 8 — Empty states and progressive disclosure
- Part 9 — Motion
- Part 10 — Technical architecture
- Part 11 — Data model
- Part 12 — API surface
- Part 13 — Source layout

---

## Part 1 — Visual language: Plum Linen

A purple-cream palette with editorial typography and aggressive accent restraint. Premium consumer-financial aesthetic, not SaaS.

### 1.1 Palette

```
Backgrounds
  bg/base            #F8F4F1   warm cream, the canvas
  bg/surface         #FFFFFF   cards, raised elements
  bg/elevated        #F2EDE9   subtle inset, week strip
  bg/icon-soft       #EDE4ED   icon containers for attention items
  bg/icon-neutral    #F0EAE6   icon containers for neutral items
  bg/track           #EDE4ED   progress bar tracks

Gradients
  plum-peach         #F0E6F0 → #F7E8E0 → #FCEEE0  pinned cards, hero treatments
  deep-plum          #3A1A4A → #2D1238              dock mic button only

Borders
  border/default     #E8E0DA   1px default
  border/hairline    rgba(0,0,0,0.05)

Text
  text/primary       #2A1F2D   deep plum-black, primary text
  text/secondary     #7A6B7D   muted plum-brown, labels and metadata
  text/tertiary      #B5A8B8   axis labels, rank numbers, hints
  text/on-dark       #F8F4F1   cream text on the dark dock mic

Accent
  accent             #6B2D7B   rich plum, the brand colour
  accent-pressed     #4F1F5C   plum-pressed
  accent-soft        rgba(107, 45, 123, 0.12)
  accent-glow        rgba(107, 45, 123, 0.30)

Chart palette
  chart-1 plum       #6B2D7B
  chart-2 dustyRose  #B85C8E
  chart-3 sage       #5C7B6B
  chart-4 terracotta #C97755
  chart-5 dustyBlue  #7A8FB8

Semantic — used sparingly
  positive           #5C7B6B   sage, positive deltas
  caution            #C97755   muted terracotta, warnings
  critical           #A33D5C   muted rose, true alerts only
```

### 1.2 Discipline rules

- Accent appears on signals, never on chrome.
- The plum-peach gradient appears on pinned cards, gauge backgrounds, and nowhere else.
- The dark-plum gradient is reserved for the mic button.
- Charts use the chart palette, never the brand accent (keeps accent scarce).
- Semantic colours only on true positive/warning/critical states — never on neutral text.

---

## Part 2 — Typography

Four font families, one role each:

- **Instrument Serif** — display numbers, hero metrics, gauge labels.
- **JetBrains Mono** — eyebrows in caps with wide tracking, dates, IDs.
- **Inter** — body, labels, descriptions, all UI copy.
- **Noto Sans Myanmar** — Burmese script.

### 2.1 Type scale

```
monoEyebrow      10/10    500   uppercase, 2.0 tracking (Latin only)
caption          11/15.4  400
body             13/18.2  400
bodyMedium       13/18.2  500
title            14/18.2  500
subhead          18/23.4  500
gaugeLabel       14       400 italic serif
serifMd          18       400 serif
serifLg          24       400 serif
serifXl          30       400 serif
serifDisplay     52       400 serif (hero metric, gauge centre)
serifUnit        20       400 italic serif (MMK)
```

Weights cap at 500. Serif used only via Instrument Serif. No mid-sentence bold.

### 2.2 Burmese line-height rules

Burmese stacked diacritics extend ~60% above Latin cap-height. `AppText` automatically:

- For variants with explicit `lineHeight`: multiplies by 2.0×, with a floor of 26px.
- For variants without `lineHeight` (display serifs): computes `max(fontSize × 1.7, 26)`.
- Sets `letterSpacing: 0` on any Burmese string regardless of variant (the `2.0` tracking from `monoEyebrow` would shatter syllables otherwise).

Mixed-content children (`<AppText>{a} · {b}</AppText>`) flatten before Burmese detection.

---

## Part 3 — Spacing and radius

```
spacing      4, 8, 12, 16, 18, 22, 24, 28, 32 (xs … 5xl)
sectionX     22  horizontal section padding
sectionY     24  vertical section padding
```

```
radius
  iconContainer     12
  attentionCard     16
  pinnedCard        20
  goalCard          24
  gaugeFrame        24
  deviceFrame       36
  dock              50
```

---

## Part 4 — Iconography

Tabler outline icons via `@tabler/icons-react-native`. Stroke 1.75. Outline only (no filled variants).

Registered names (all referenced via `<Icon name="..." />`):

```
home, reports, analytics, profile, mic, bell, pin,
chevron-right, chevron-up, chevron-down,
x, square, arrow-left, clock,
trending-up, trending-down,
sparkles, alert-triangle, tag, package,
speakerphone, rocket, bulb, shield-check, chart-line
```

---

## Part 5 — Screen architecture

### 5.1 Dock (always visible)

```
[ Home ]  [ Reports ]  [ ● Mic ● ]  [ Analytics ]  [ Profile ]
```

The mic is 48×48, deep-plum gradient background, cream icon, plum-glow shadow. Tap opens the `record` modal screen. Inactive items: muted plum-brown icon. Active item: plum-pressed icon, accent-soft pill background.

Hidden routes (reachable only via `router.push`, never appear in dock):
- `business-profile`, `manual-entry`, `confirm-facts`, `import-sales`
- The 4 `analytics/<section>` detail sub-pages

### 5.2 Auth + onboarding flow (no dock)

```
(auth)/index           Google + email/password login screen
  ↓
(onboarding)/
  index                Step 1 — name + business type chips + product text
  pos                  Step 2 — yes/no POS toggle
  periods              Step 3 — multi-select sales periods
  sales-values         Step 4 — numeric input per chosen period
  expenses             Step 5 — monthly expenses
  competitors          Step 6 — comma-separated names (None skips next)
  rival-details        Step 7 — pricing tier + audience per rival
  customers            Step 8 — paste regular customer names
  products             Step 9 — paste top products + optional price
  suppliers            Step 10 — paste suppliers + optional supply
  bulk-import          Step 11 — Excel upload OR text paste OR skip
                       (calls finishOnboarding → flips to (app))
```

Each step is wrapped in `WizardStep` (progress bar, step counter, scrollable body, primary + secondary CTAs).

### 5.3 Home (`(app)/index.tsx`)

Top-to-bottom regions:

1. **HomeHeader** — date in mono caps + Burmese greeting with owner name.
2. **ProfileNudge** — banner if any AI-context field is missing.
3. **DailySummary** — "Today: 19.5K MMK" + delta vs yesterday.
4. **HeroMetric** — large serif number for the owner's chosen metric (today_sales / week_sales / month_revenue / outstanding).
5. **AlertChips** — caution chip for outstanding receivables; critical chip if today's expenses > sales.
6. **RecentEntries** — 5 most recent confirmed facts, swipe-to-delete via `react-native-gesture-handler`.

Cold-start variant: hides 3–6, shows `ColdStartHero` with a large mic icon + Burmese prompt.

### 5.4 Reports (`(app)/reports.tsx`)

1. **WeekStrip** — last 7 days, side-by-side sales (plum) + expenses (terracotta) bars.
2. **MonthSummary** — text rows for sales, expenses, net (sage if positive, critical if negative).
3. **CategoryBreakdown** — proportional bars per kind for the month.
4. **TopCustomers** — month-window ranking, names + amounts + thin plum bars.
5. **ReceivablesList** — open balances, oldest first.

### 5.5 Analytics (`(app)/analytics/`)

Stack layout. Index is opt-in (Generate button card); detail screens reuse the cached `["insights"]` React Query result.

```
analytics/
  _layout.tsx              Stack — no header (uses SubHeader inside)
  index.tsx                Overview: AI headline + scores + risk + 4 nav cards
  trend.tsx                Revenue 14-day bars + 7-day forecast
  swot.tsx                 Single-column SWOT panels
  segments.tsx             Customer segments breakdown
  recommendations.tsx      4 themed AI recommendation cards
```

Overview nav cards each show a 1-line Burmese preview (e.g. `အားသာ 3 · အားနည်း 2 · အခွင့်အလမ်း 2 · ခြိမ်းခြောက် 1`) so the user knows what's inside.

### 5.6 Profile (`(app)/profile.tsx`)

1. Avatar + business name + owner name.
2. **Business profile** group — opens `business-profile.tsx` editor.
3. **Data** group — opens `import-sales.tsx` (post-onboarding Excel import).
4. Sign out button.

### 5.7 Record (modal — `(app)/record.tsx`)

Full-screen modal presented from the dock mic. Audio waveform + recording timer + cancel/stop. On stop: upload → transcript → navigate to `confirm-facts`.

### 5.8 Confirm-facts (`(app)/confirm-facts.tsx`)

Transcript at top (collapsible). Below: each extracted fact as an editable card with kind chip, amount, counterparty, description. Save all → writes to backend → invalidates Home/Reports/Analytics → navigates back.

---

## Part 6 — Component library

Located under `mobile/src/components/`:

### 6.1 UI primitives (`components/ui/`)

| Component | Purpose |
|---|---|
| `AppText` | Wraps RN Text. Auto-handles Burmese line-height, family-swap, letter-spacing. Variant + color props. |
| `Button` | Primary + secondary variants. Disabled state via style opacity. |
| `Chip` | Selectable pill. Selected = accent-soft bg + accent-base text. |
| `Eyebrow` | Mono caps label, secondary colour. Skips uppercase + tracking on Burmese content. |
| `Icon` | Wraps Tabler. Default size 22, stroke 1.75. |
| `SelectRow` | Single-select row with checkmark. |
| `SerifMetric` | Serif display number with optional unit. |
| `Surface` | Card with rounded radius, default border. |
| `TextField` | TextInput with surface bg, default border, body font. |

### 6.2 Layout (`components/layout/`)

| Component | Purpose |
|---|---|
| `Screen` | Safe-area top inset, dock-clearance bottom padding, ScrollView or View. |
| `FormScreen` | Title + subtitle + body + pinned bottom CTA. |
| `WizardStep` | FormScreen + progress bar + step counter + secondary CTA support. |
| `SubHeader` | Back chevron + title, used in analytics sub-pages. |
| `EmptyState` | Icon + headline + subline + CTA button. |

### 6.3 Domain (`components/{home,reports,analytics,nav}/`)

- **Home:** `HomeHeader`, `HeroMetric`, `DailySummary`, `AlertChips`, `RecentEntries`, `ProfileNudge`, `ColdStartHero`.
- **Reports:** `WeekStrip`, `MonthSummary`, `CategoryBreakdown`, `TopCustomers`, `ReceivablesList`.
- **Analytics:** `widgets.tsx` exports `Headline`, `ScoreCard`, `RiskCard`, `RevenueTrend`, `ForecastCard`, `SwotPanel`, `SegmentsCard`, `RecCard`. Plus `SectionNavCard` for overview drill-in.
- **Nav:** `FloatingDock` (4 tabs + center mic).

---

## Part 7 — Burmese script rendering rules

1. **Font swap.** When a string contains any codepoint in `U+1000–U+109F`, `AppText` swaps `fontFamily`: `InstrumentSerif → NotoSansMyanmar`, `Inter → NotoSansMyanmar`, `Inter-Medium → NotoSansMyanmar-Medium`.
2. **Line-height.** Either `2.0 × baseLineHeight` (variants with `lineHeight` set) or `1.7 × fontSize` (display serifs without `lineHeight`), floor 26px.
3. **Letter-spacing.** Forced to `0` for any Burmese string. Eyebrow's English `2.0` tracking is skipped.
4. **Mixed children.** `flattenText()` walks the React node tree so `<AppText>{a} · {b}</AppText>` still detects Burmese inside template-literal patterns.

These rules prevent the most common Myanmar rendering failures: top-clipping of stacked diacritics, syllable shattering from tracking, and tofu (□) when Android falls back without the embedded font.

---

## Part 8 — Empty states and progressive disclosure

- **Day 0 Home:** ColdStartHero — large mic icon, Burmese "tell me what happened today" prompt.
- **Other tabs day 0:** EmptyState with Burmese headline, English mono subline explaining what unlocks the screen, and a CTA where there's an action.
- **Analytics:** Opt-in CTA card; AI only fires on tap. Sub-pages use the cached query result.
- **Per-chart gate:** Some charts (forecast, segments) hide their bars until enough data exists; the wrapping card still renders so the screen doesn't feel broken.

---

## Part 9 — Motion

- **Card tap:** scale to 0.98 over 120ms.
- **Page transitions:** 240ms ease-out slide (Expo Router default).
- **Mic press:** scale to 0.94 + plum-glow pulse.
- **Sparkline draw-on:** stroke-dasharray over 600ms ease-out, first load only.
- **Gauge fill:** radial sweep over 800ms on Reports load.

No spring physics, no bouncing, no rotation.

---

## Part 10 — Technical architecture

```
┌──────────────────────────────────────────────────────┐
│  Expo React Native app  (mobile/)                    │
│  • expo-router file-based routing                    │
│  • Zustand for client state (profile + onboarding)   │
│  • React Query for server state                      │
│  • Supabase JS client for auth                       │
└────────────────────┬─────────────────────────────────┘
                     │ POST /api/mobile/v1/*
                     │ Authorization: Bearer <Supabase JWT>
                     ▼
┌──────────────────────────────────────────────────────┐
│  Next.js backend  (src/app/api/mobile/v1/...)        │
│  • authenticateMobileRequest() validates JWT         │
│  • getOrCreateMobileWorkspace() resolves workspace   │
│  • Drizzle ORM → Neon Postgres                       │
│  • GeminiProvider for all LLM calls                  │
└────────────────────┬─────────────────────────────────┘
                     │ httpOptions.baseUrl = GEMINI_PROXY_URL
                     ▼
┌──────────────────────────────────────────────────────┐
│  Supabase Edge Function  (gemini-proxy)              │
│  • Deno runtime, hosted at the Supabase edge         │
│  • Injects GEMINI_API_KEY from function secret       │
│  • Forwards verbatim to Google's API                 │
└────────────────────┬─────────────────────────────────┘
                     │ POST generativelanguage.googleapis.com
                     ▼
              Google Gemini 2.5 Flash
```

### 10.1 Auth bypass

Controlled by two env vars:
- `EXPO_PUBLIC_AUTH_BYPASS` (mobile) — `true` makes `_layout.tsx` skip `(auth)` and `(onboarding)`, lands directly in `(app)`.
- `AUTH_BYPASS` (backend) — `true` makes `authenticateMobileRequest` return a stub dev user instead of validating the JWT.

Both default to `true` in development, `false` in production builds.

### 10.2 Insights caching

`workspaces.insightsJson` (jsonb) holds the latest StrategicInsights blob with `insightsGeneratedAt`. The `/insights` endpoint:
- Returns cache instantly if present.
- If stale (>6h), kicks `triggerInsightsRegen(workspaceId)` (fire-and-forget, deduped per workspace via an in-process Map).
- If no cache (first request with signal), generates inline.

Background regen is also triggered by `/facts/confirm` POST and `/facts/[id]` DELETE.

### 10.3 LLM retry policy

`GeminiProvider.structured()` wraps every call with `withRetries(fn, { tries: 3, baseMs: 800 })`. Retries fire on `503 UNAVAILABLE`, `502`, `504`, `429`, "rate limit", "overload", or "high demand". Non-retryable errors (JSON parse, schema validation) throw immediately.

---

## Part 11 — Data model

Postgres schema (Drizzle definitions in `src/db/schema.ts`):

### 11.1 Core

```
users
  id text PK (Supabase user id)
  email text NOT NULL
  created_at timestamp

workspaces
  id text PK ("ws_<cuid>")
  owner_id text → users.id
  name text NOT NULL                business name
  business_description text
  -- profile (onboarding wizard)
  business_type text                "fnb" | "retail" | ...
  product_service text
  location text
  monthly_target_mmk integer
  biggest_challenge text
  budget_mmk integer
  pos_enabled boolean
  sales_periods jsonb               ("daily" | "weekly" | "monthly" | "yearly")[]
  sales_values jsonb                { daily?, weekly?, monthly?, yearly? } MMK
  monthly_expenses_mmk integer
  competitors jsonb                 string[]
  competitor_details jsonb          { name, tier, audience }[]
  customers_seed jsonb              string[]
  products_seed jsonb               { name, priceMmk? }[]
  suppliers_seed jsonb              { name, supplies? }[]
  -- insights cache
  insights_json jsonb               StrategicInsights blob
  insights_generated_at timestamp
  insights_status text              "idle" | "generating"
  created_at, updated_at timestamp
```

### 11.2 Facts

```
voice_recordings
  id text PK ("vrec_<cuid>")
  workspace_id text → workspaces.id
  duration_secs integer
  transcript text
  transcribed_at timestamp
  recorded_at timestamp

facts                               canonical extracted fact log
  id text PK ("fact_<cuid>")
  workspace_id text → workspaces.id
  recording_id text → voice_recordings.id (nullable)
  kind text                         "sale" | "expense" | "receivable" | "note"
  amount_mmk integer
  description text NOT NULL
  counterparty text
  occurred_at timestamp NOT NULL
  created_at timestamp NOT NULL
```

Other tables (`materials`, `entities`, `edges`, `mentions`, `branches`, `commits`, `simulations`, `agents`, `agent_messages`, `entity_summaries`) remain from the prior founder web app but are unused by the mobile API. Safe to keep — they don't affect runtime.

---

## Part 12 — API surface

All routes under `src/app/api/mobile/v1/`. All require `Authorization: Bearer <Supabase JWT>` unless `AUTH_BYPASS=true`.

```
POST   /auth/sync                Sync Supabase user → workspace on first sign-in
GET    /home                     Today + week + month metrics + recent entries
GET    /reports                  Week strip + month totals + receivables + top customers + categories
GET    /analytics                Kind breakdown + top counterparties + recent (used internally)
GET    /insights                 Cached StrategicInsights or trigger first-run generation
GET    /profile                  Read business profile + seeds
PUT    /profile                  Update any subset of profile fields
POST   /voice/upload             Multipart audio upload → transcribe → extract → return facts
POST   /facts/confirm            Bulk-insert user-confirmed facts (triggers insights regen)
DELETE /facts/[id]               Soft-scope delete by workspace (triggers insights regen)
POST   /sales/import/preview     Multipart Excel upload → parse + LLM column detection
POST   /sales/import/confirm     JSON { headers, rows, mapping } → bulk insert facts
POST   /sales/import/text        JSON { text } → LLM extract → bulk insert
```

All payloads are Zod-validated on entry. Errors return `{ error: <zod.flatten() | string> }` with appropriate status (400 / 401 / 502).

---

## Part 13 — Source layout

```
lattice/
├── docs/
│   ├── PRD.md
│   └── DESIGN.md (this file)
├── scripts/
│   ├── seed-dev.ts                  Dummy data for the dev workspace
│   ├── create-tables.ts             Initial table bootstrap
│   ├── add-profile-columns.ts       Migration: profile fields
│   ├── add-insights-cache-columns.ts
│   ├── add-onboarding-columns.ts
│   ├── add-seed-columns.ts          Migration: customers/products/suppliers seeds
│   └── make-sample-xlsx.ts          Generates sample-sales.xlsx
├── supabase/
│   └── functions/
│       └── gemini-proxy/
│           └── index.ts             Deno edge function (Gemini passthrough)
├── src/
│   ├── app/
│   │   ├── layout.tsx               Strivo backend placeholder layout
│   │   ├── page.tsx                 Placeholder page at localhost:3000/
│   │   └── api/mobile/v1/...        All mobile API routes
│   ├── db/
│   │   ├── client.ts                Drizzle + postgres client
│   │   └── schema.ts                Full Postgres schema
│   ├── lib/
│   │   ├── auth/mobile.ts           Supabase JWT validator + workspace resolver
│   │   ├── env.ts                   Zod-validated env (DATABASE_URL, GEMINI_*, SUPABASE_*, AUTH_BYPASS)
│   │   ├── id.ts                    cuid2 wrapper
│   │   ├── insights/
│   │   │   ├── strategic.ts         AI insights generator (computeMetrics + generateInsights)
│   │   │   └── cache.ts             Background regen + dedupe lock
│   │   ├── extraction/mobile-facts.ts   LLM fact extractor (voice + text paste)
│   │   ├── transcription/gemini-audio.ts   Audio → text via Gemini
│   │   ├── import/sales-excel.ts    XLSX parse + LLM column detection + rows-to-facts
│   │   └── llm/
│   │       ├── index.ts             getLLM() factory
│   │       ├── types.ts             LLMProvider interface
│   │       ├── errors.ts            LLMProviderError
│   │       └── providers/gemini.ts  Gemini implementation (with proxy support + retries)
│   └── proxy.ts                     [deleted — Clerk middleware removed]
└── mobile/                          Expo React Native app
    ├── app.json                     scheme: "lattice"
    ├── .env                         EXPO_PUBLIC_* (supabase, api base url, auth bypass)
    └── src/
        ├── app/
        │   ├── _layout.tsx          Root nav + auth gate
        │   ├── (auth)/
        │   │   ├── _layout.tsx
        │   │   └── index.tsx        Google + email/password login
        │   ├── (onboarding)/        11-step wizard
        │   │   ├── _layout.tsx
        │   │   ├── index.tsx         Step 1
        │   │   ├── pos.tsx           Step 2
        │   │   ├── periods.tsx       Step 3
        │   │   ├── sales-values.tsx  Step 4
        │   │   ├── expenses.tsx      Step 5
        │   │   ├── competitors.tsx   Step 6
        │   │   ├── rival-details.tsx Step 7
        │   │   ├── customers.tsx     Step 8
        │   │   ├── products.tsx      Step 9
        │   │   ├── suppliers.tsx     Step 10
        │   │   └── bulk-import.tsx   Step 11 (terminal)
        │   ├── (app)/
        │   │   ├── _layout.tsx       Tabs + FloatingDock
        │   │   ├── index.tsx         Home
        │   │   ├── reports.tsx
        │   │   ├── analytics/        Stack with index + 4 detail sub-pages
        │   │   ├── profile.tsx
        │   │   ├── business-profile.tsx
        │   │   ├── manual-entry.tsx
        │   │   ├── confirm-facts.tsx
        │   │   └── import-sales.tsx
        │   └── record.tsx            Modal
        ├── components/               Per Part 6 above
        ├── contexts/AuthContext.tsx  Supabase auth state + sign-in flows
        ├── stores/
        │   ├── profile.ts            Zustand: businessName, ownerName, heroMetric, onboarded
        │   └── onboarding.ts         Zustand: wizard draft
        ├── lib/
        │   ├── api.ts                Typed fetch wrappers for every mobile API route
        │   ├── env.ts                Mobile env loader
        │   ├── supabase.ts           Supabase JS client
        │   ├── query.ts              React Query provider
        │   ├── format.ts             formatCurrency (MMK abbreviations)
        │   ├── finish-onboarding.ts  Flush wizard draft → backend + flip onboarded
        │   └── id.ts
        ├── theme/
        │   ├── tokens.ts             Colors + spacing + radius + type scale
        │   └── fonts.ts              expo-font loader (Instrument Serif, Inter, JBM, Noto)
        └── i18n/my.ts                All Burmese UI strings
```

---

End of Design v1.
