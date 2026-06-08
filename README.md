<div align="center">

# Strivo

**Your business, finally making sense.**

AI-powered business assistant for Myanmar MSMEs. Shop owners log sales and expenses
by Excel, text, or manual entry — Strivo turns raw transactions into financial
reports and AI strategic insights, all in Burmese. A single **responsive web app**:
one URL, works on any phone or desktop browser, nothing to install.

</div>

---

## Table of Contents

- [What is Strivo](#what-is-strivo)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Repository Layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
  - [1. Clone & install](#1-clone--install)
  - [2. Provision cloud services](#2-provision-cloud-services)
  - [3. Environment](#3-environment)
  - [4. Database schema](#4-database-schema)
  - [5. Gemini edge proxy](#5-gemini-edge-proxy)
  - [6. Run it](#6-run-it)
- [Seeding Test Accounts](#seeding-test-accounts)
- [Common Commands](#common-commands)
- [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)

---

## What is Strivo

Strivo is a single **Next.js** application that serves both the user-facing
responsive web app and its API:

- **Web app** (Next.js App Router + React DOM) — the Burmese-first, mobile-first
  responsive interface a shop owner uses daily. Renders as a centered phone-width
  column on desktop and goes full-bleed on phones.
- **API** (Next.js Route Handlers under `/api/mobile/v1/*`) — auth, data, and AI
  orchestration. (The `mobile` path segment is a historical name; the routes serve
  the web app over the same origin.)

Backed by **Supabase** (auth + edge functions), **Neon** (Postgres), and
**Google Gemini 2.5 Flash** (LLM).

> **Heritage:** the UI was originally an Expo / React Native app. It now runs as
> plain web via a small React-Native-compatibility layer (`src/rn/`) that renders
> real DOM elements — so the design system and screen logic port directly while
> the stack is 100% web (no react-native-web).

---

## Features

- **Three ways to add data** — Excel/CSV import, paste-text (AI extraction), or manual entry.
- **Financial reports** — P&L, sales/expense breakdown by category, top customers.
- **AI insights** — growth & market scores, SWOT, customer segments, recommendations.
- **Scenario explorer** — "what if I raise prices 10%?" projections grounded in your data.
- **Burmese-first** — full Myanmar localization with Noto Sans Myanmar.
- **Multi-tenant** — every user has an isolated workspace.

---

## Tech Stack

| Area | Stack |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19 (DOM), TanStack React Query, Zustand, lucide-react, next/font |
| **RN compat** | `src/rn/` — View/Text/Pressable/StyleSheet/LinearGradient shims rendering DOM (no react-native-web) |
| **Backend** | Next.js Route Handlers, Drizzle ORM, Zod, @google/genai |
| **Database** | Neon (serverless Postgres) |
| **Auth** | Supabase Auth (Google OAuth + email/password), browser SDK + server-side JWT bridge |
| **AI** | Google Gemini 2.5 Flash via Supabase Edge proxy (multi-key rotation) |

Full details in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Repository Layout

```
lattice/                          # the Next.js web app (frontend + API)
├── src/
│   ├── app/
│   │   ├── (tabs)/               # home (/), reports, analytics, profile + dock
│   │   │   └── analytics/        # trend, swot, segments, scenarios, recommendations
│   │   ├── onboarding/           # 10-step wizard
│   │   ├── login/                # auth screen
│   │   ├── record, manual-entry, import-*, business-profile, confirm-facts
│   │   ├── api/mobile/v1/        # API routes (home, reports, insights, imports…)
│   │   ├── layout.tsx            # fonts + providers + responsive app frame
│   │   └── globals.css
│   ├── rn/                       # React Native → DOM compatibility layer
│   ├── components/               # ui, layout, nav, home, reports, analytics, app
│   ├── contexts/                 # AuthContext (Supabase browser auth)
│   ├── stores/                   # Zustand (onboarding, profile)
│   ├── lib/                      # api client, client-env, supabase-browser, format, …
│   ├── theme/tokens.ts           # Plum Linen design tokens
│   ├── i18n/my.ts                # Burmese strings
│   └── db/, lib/auth, lib/llm, lib/insights, lib/extraction   # backend
├── supabase/functions/           # gemini-proxy edge function (Deno)
├── scripts/                      # DB migrations, seeding, RLS, dev utilities
├── drizzle.config.ts
├── ARCHITECTURE.md
└── README.md

../lattice-landing/               # separate static marketing site (deployed on its own)
```

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| **Node.js** | ≥ 20 | Runtime + tooling |
| **pnpm** | ≥ 10 | Package manager (repo ships a `pnpm-lock.yaml`) |
| **Supabase CLI** | latest | Deploy the edge function (`brew install supabase/tap/supabase`) |
| **A Neon account** | — | Serverless Postgres |
| **A Supabase project** | — | Auth + edge functions |
| **A Google AI Studio key** | — | Gemini API (permanent `AIzaSy…` keys) |

---

## Setup

### 1. Clone & install

```bash
git clone <repo-url> lattice
cd lattice
pnpm install
```

### 2. Provision cloud services

1. **Neon** — create a project, copy the connection string (`postgresql://…`).
2. **Supabase** — create a project. From **Settings → API**, copy:
   - Project URL
   - `anon` public key
   - `service_role` key (keep secret)

   Enable **Google** and **Email** providers under **Authentication → Providers**.
   Add your web app origin (e.g. `http://localhost:3000`) to the **Redirect URLs**.
3. **Google AI Studio** — create one or more API keys (`AIzaSy…` format — these are
   permanent, unlike the short-lived `AQ.` OAuth tokens).

### 3. Environment

Copy the example and fill it in:

```bash
cp .env.example .env.local
```

```env
# Neon Postgres
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
DATABASE_URL_OWNER=postgresql://owner:pass@host/db?sslmode=require   # migrations/seeding

# Supabase — server-side JWT bridge
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # admin ops (account delete, seeding)

# Supabase — browser client (exposed to the client bundle)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Auth bypass — both default true in dev; set to "false" for real auth + prod
AUTH_BYPASS=true
NEXT_PUBLIC_AUTH_BYPASS=true

# Gemini
GEMINI_API_KEY=AIzaSy...            # caller-key fallback
GEMINI_PROXY_URL=https://<project>.supabase.co/functions/v1/gemini-proxy
```

> With `*_AUTH_BYPASS=true` the app boots straight into the dashboard with a stub
> dev user and no Supabase needed — handy for local UI work. Set both to `false`
> to exercise the real Google / email login + onboarding flow.

### 4. Database schema

```bash
pnpm db:push          # sync Drizzle schema to Neon
pnpm db:generate      # generate SQL migrations from schema
pnpm db:migrate       # apply migrations
pnpm db:studio        # open Drizzle Studio
```

### 5. Gemini edge proxy

Deploy the proxy that routes Gemini calls with multi-key rotation:

```bash
# Set the rotating key pool (comma-separated, no spaces/newlines)
supabase secrets set GEMINI_API_KEYS="AIzaSy...,AIzaSy..." --project-ref <project-ref>

# Deploy
supabase functions deploy gemini-proxy --project-ref <project-ref>
```

> The proxy falls back to the caller's `GEMINI_API_KEY` if every pooled key is rate-limited or expired.

### 6. Run it

```bash
pnpm dev             # http://localhost:3000
```

Open the URL in any browser — resize the window to see the responsive column.
Build and serve production with `pnpm build && pnpm start`.

---

## Seeding Test Accounts

Scripts read `DATABASE_URL_OWNER` + `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`.

```bash
# Two fully-populated demo shops (~190 facts each: tea shop + phone repair)
pnpm tsx --env-file=.env.local scripts/seed-test-accounts.ts

# One empty account that runs onboarding from scratch
pnpm tsx --env-file=.env.local scripts/seed-empty-account.ts
```

Default credentials after seeding:

| Account | Email | Password | State |
|---|---|---|---|
| Tea shop (Yangon) | `shop1@strivo.test` | `ShopOne!2026` | full data |
| Phone repair (Mandalay) | `shop2@strivo.test` | `ShopTwo!2026` | full data |
| Empty | `empty@strivo.test` | `EmptyShop!2026` | onboarding |

---

## Common Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Start the dev server (frontend + API) |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest |
| `pnpm db:push` | Sync Drizzle schema to Neon |
| `pnpm db:studio` | Drizzle Studio GUI |
| `pnpm exec tsc --noEmit` | Typecheck |
| `supabase functions deploy gemini-proxy` | Redeploy the AI proxy |

---

## Troubleshooting

**App jumps straight into the dashboard without a login screen**
`NEXT_PUBLIC_AUTH_BYPASS` is `true` (the dev default). Set it (and `AUTH_BYPASS`)
to `false` and restart to exercise the real Supabase auth + onboarding flow.

**Google sign-in returns to the app but stays logged out**
Add your exact origin (e.g. `http://localhost:3000`) to Supabase
**Authentication → URL Configuration → Redirect URLs**.

**`API key expired` / Gemini 502**
A pooled key is invalid. Set only valid permanent `AIzaSy…` keys:
`supabase secrets set GEMINI_API_KEYS="AIzaSy..." --project-ref <ref>` then redeploy.
(The `AQ.` tokens from AI Studio are short-lived OAuth tokens — don't use them.)

**Home shows the "add data" card despite having data**
The home view checks today/week/month activity. Pull latest, `pnpm db:push`,
and confirm the backend returns `recentFallback` for accounts with only old facts.

**Burmese text renders as boxes (tofu)**
The font stacks fall back to Noto Sans Myanmar (loaded via `next/font`). Make sure
the four font variables are applied on `<html>` in `src/app/layout.tsx`.

---

## Architecture

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full system design — data model,
auth flow, AI orchestration, navigation structure, and cost profile.

---

<div align="center">
<sub>Built for Myanmar shop owners. Burmese-first. AI-powered.</sub>
</div>
