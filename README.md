<div align="center">

# Strivo

**Your business, finally making sense.**

AI-powered business assistant for Myanmar MSMEs. Shop owners log sales and expenses
by Excel, text, or manual entry — Strivo turns raw transactions into financial
reports and AI strategic insights, all in Burmese.

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
  - [3. Backend environment](#3-backend-environment)
  - [4. Database schema](#4-database-schema)
  - [5. Gemini edge proxy](#5-gemini-edge-proxy)
  - [6. Mobile environment](#6-mobile-environment)
  - [7. Run it](#7-run-it)
- [Seeding Test Accounts](#seeding-test-accounts)
- [Common Commands](#common-commands)
- [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)

---

## What is Strivo

Strivo is a two-part system:

- **Mobile app** (Expo / React Native) — the Burmese-first interface a shop owner uses daily.
- **Backend API** (Next.js) — auth, data, and AI orchestration.

Backed by **Supabase** (auth + edge functions), **Neon** (Postgres), and **Google Gemini 2.5 Flash** (LLM).

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
| **Mobile** | Expo SDK 56, React Native 0.85, expo-router, Zustand, TanStack React Query, Supabase JS |
| **Backend** | Next.js 16.2.6 (App Router), Drizzle ORM, Zod, @google/genai |
| **Database** | Neon (serverless Postgres) |
| **Auth** | Supabase Auth (Google OAuth + email/password) |
| **AI** | Google Gemini 2.5 Flash via Supabase Edge proxy (multi-key rotation) |

Full details in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Repository Layout

```
lattice/
├── src/                       # Next.js backend
│   ├── app/api/mobile/v1/     # Mobile API routes (home, reports, insights, imports…)
│   ├── db/                    # Drizzle schema + client
│   ├── lib/
│   │   ├── auth/              # Supabase JWT verify + workspace resolution
│   │   ├── llm/               # Gemini provider (proxy, retries, JSON repair)
│   │   ├── extraction/        # Burmese fact extraction
│   │   └── insights/          # Strategic insights + scenario projection
│   └── ...
├── mobile/                    # Expo / React Native app
│   └── src/
│       ├── app/               # expo-router screens ((auth), (onboarding), (app)/(tabs)…)
│       ├── components/        # UI, home, reports, analytics, nav
│       ├── stores/            # Zustand (onboarding, profile)
│       ├── contexts/          # AuthContext
│       ├── lib/               # api client, env, supabase
│       └── i18n/              # Burmese strings
├── supabase/functions/        # gemini-proxy edge function (Deno)
├── scripts/                   # DB migrations, seeding, RLS, dev utilities
├── drizzle.config.ts
├── ARCHITECTURE.md
└── README.md
```

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| **Node.js** | ≥ 20 (tested on 26) | Backend + mobile tooling |
| **npm** | ≥ 10 | Package manager |
| **Expo Go** or a dev build | SDK 56 | Run the app on a device/simulator |
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

# Backend deps (repo root)
npm install

# Mobile deps
cd mobile && npm install && cd ..
```

### 2. Provision cloud services

1. **Neon** — create a project, copy the connection string (`postgresql://…`).
2. **Supabase** — create a project. From **Settings → API**, copy:
   - Project URL
   - `anon` public key
   - `service_role` key (keep secret)

   Enable **Google** and **Email** providers under **Authentication → Providers**.
3. **Google AI Studio** — create one or more API keys (`AIzaSy…` format — these are
   permanent, unlike the short-lived `AQ.` OAuth tokens).

### 3. Backend environment

Copy the example and fill it in:

```bash
cp .env.example .env.local
```

```env
# Neon Postgres
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
DATABASE_URL_OWNER=postgresql://owner:pass@host/db?sslmode=require   # for migrations/seeding

# Supabase
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # admin ops (account delete, seeding)

# Gemini
GEMINI_API_KEY=AIzaSy...            # caller-key fallback
GEMINI_PROXY_URL=https://<project>.supabase.co/functions/v1/gemini-proxy
```

### 4. Database schema

Push the Drizzle schema to Neon:

```bash
npm run db:push
```

Other DB commands:

```bash
npm run db:generate   # generate SQL migrations from schema
npm run db:migrate    # apply migrations
npm run db:studio     # open Drizzle Studio
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

### 6. Mobile environment

Create `mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Backend base URL. In dev, use your machine's LAN IP so a physical
# device can reach the Next.js server (find it with: ipconfig getifaddr en0)
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:3000

# Keep "false" to test the real Supabase login flow.
EXPO_PUBLIC_AUTH_BYPASS=false
```

### 7. Run it

**Terminal 1 — backend:**

```bash
npm run dev          # Next.js on http://localhost:3000
```

**Terminal 2 — mobile:**

```bash
cd mobile
npm start            # Expo dev server; scan QR with Expo Go
# or
npm run ios          # iOS simulator
npm run android      # Android emulator
```

> **Native changes** (app icon, splash, native plugins) need a rebuild:
> `cd mobile && npx expo prebuild --clean && npx expo run:ios`

---

## Seeding Test Accounts

Scripts read `DATABASE_URL_OWNER` + `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`.

```bash
# Two fully-populated demo shops (~190 facts each: tea shop + phone repair)
npx tsx --env-file=.env.local scripts/seed-test-accounts.ts

# One empty account that runs onboarding from scratch
npx tsx --env-file=.env.local scripts/seed-empty-account.ts
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
| `npm run dev` | Start Next.js backend |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run db:push` | Sync Drizzle schema to Neon |
| `npm run db:studio` | Drizzle Studio GUI |
| `cd mobile && npm start` | Expo dev server |
| `npx tsc --noEmit` | Typecheck (run in both root and `mobile/`) |
| `supabase functions deploy gemini-proxy` | Redeploy the AI proxy |

---

## Troubleshooting

**`fetch failed: The request timed out` (mobile)**
iOS enforces a ~60s native request timeout. Usually means the dev server isn't
reachable — check `EXPO_PUBLIC_API_BASE_URL` matches your current LAN IP
(`ipconfig getifaddr en0`). Restart Expo after changing `.env`.

**`API key expired` / Gemini 502**
A pooled key is invalid. Set only valid permanent `AIzaSy…` keys:
`supabase secrets set GEMINI_API_KEYS="AIzaSy..." --project-ref <ref>` then redeploy.
(The `AQ.` tokens from AI Studio are short-lived OAuth tokens — don't use them.)

**App jumps straight to onboarding without login**
You have a persisted Supabase session from earlier testing. Sign out (Profile →
ထွက်မည် on the onboarding screen) to return to the login screen.

**Home shows the "add data" card despite having data**
The home view checks today/week/month activity. Pull latest, `npm run db:push`,
and confirm the backend returns `recentFallback` for accounts with only old facts.

**Changes don't appear on device**
JS changes: shake → Reload. Native changes (icon/splash/plugins): rebuild with
`npx expo prebuild --clean && npx expo run:ios`.

**Metro serving a stale bundle**
`cd mobile && npx expo start --clear`

---

## Architecture

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full system design — data model,
auth flow, AI orchestration, navigation structure, and cost profile.

---

<div align="center">
<sub>Built for Myanmar shop owners. Burmese-first. AI-powered.</sub>
</div>
