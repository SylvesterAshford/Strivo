# Strivo — Product Requirements Document (v1)

**Codebase:** Lattice • **Status:** v1 in active development • **Last updated:** 2026-05-28

---

## 1. Product summary

Strivo is a Burmese-primary mobile companion that helps Myanmar small business owners run their shop, restaurant, services, or trading business from a phone. The owner feeds the app via voice, text, Excel uploads, or pasted ledger snippets. The app extracts structured facts, builds a temporal model of the business, and surfaces a daily briefing, financial report, and AI-generated strategic insights — all delivered in Burmese.

**Single-sentence pitch:** Tell your shop what happened today, and it tells you what to do tomorrow.

---

## 2. Who this is for

- **Primary user:** A 30–55 year old Myanmar small business owner running a single location (shop, F&B, services, B2B trading) with 1–10 employees.
- **Literacy assumption:** Reads Burmese fluently. May read some English (mono labels, day names, MMK unit). Cannot rely on long English UI copy.
- **Device assumption:** Mid-range Android (most common) or iOS. Mixed 3G/4G connectivity. Probably one device per business.
- **Time budget:** 30–90 seconds per session, multiple sessions per day.
- **What they need to answer every morning:**
  1. Am I making money this week?
  2. Who hasn't paid me?
  3. What's running low?
  4. What's about to bite me?

---

## 3. Goals

### Business goals
- Validate that a voice/text first AI assistant produces real behaviour change for Myanmar MSME owners.
- Build a temporal knowledge graph per workspace as the long-term moat (engine reused from prior founder web app).
- Ship v1 to closed beta in 10 weeks of solo developer time.

### User goals
- Capture today's sales/expenses/receivables in under 30 seconds.
- See a one-glance picture of how the business is doing this week and this month.
- Receive AI-generated, Burmese-language strategic recommendations grounded in the owner's actual data + competitive context.
- Never see the AI fail silently — every data path has a visible recovery state.

### Non-goals (explicitly out of v1)
- POS integration, bank SMS parsing, photo OCR — design defers to v1.2.
- Multi-user / multi-location workspaces.
- Dark mode.
- Offline-first writes (reads come from cache, writes require network).
- Real-time chat with the AI ("talk this through" mode is deferred to v1.1).
- Telegram bot integration (Phase 3 of original plan — not built).

---

## 4. Locked product decisions

1. **Language:** Burmese-primary UI. English used only for mono eyebrows, MMK unit, day labels, and chart axis labels where space is constrained.
2. **Numerals:** Arabic numerals throughout. Burmese-numeral input is auto-converted on parse.
3. **Currency:** MMK. Abbreviated on hero/aggregates (`850K MMK`, `8.5M MMK`, `1.2Cr MMK`); full numerals on detail screens.
4. **Auth:** Supabase email+password (admin/dev) and Google OAuth (end-user path). Phone OTP was removed in favour of OAuth+email.
5. **AI provider:** Gemini 2.5 Flash, accessed via a Supabase Edge Function (`gemini-proxy`) so calls work from Myanmar.
6. **Engine:** Temporal knowledge graph retained internally; the owner never sees entities, edges, or branches.
7. **Dock:** 4 explicit tabs (Home / Reports / Analytics / Profile) + a center mic action button.
8. **Visual language:** "Plum Linen" — see DESIGN.md Part 5.

---

## 5. Feature inventory (what ships in v1)

### 5.1 Authentication & onboarding

- **Login screen:** Google OAuth (primary) + email/password fallback + dev-skip button gated by `EXPO_PUBLIC_AUTH_BYPASS`.
- **11-step onboarding wizard** (must complete on first sign-in):

| # | Step | Required? |
|---|---|---|
| 1 | Business name + type + product | required |
| 2 | POS system in use | required |
| 3 | Which sales periods you track | required |
| 4 | Average sales per period | required |
| 5 | Monthly operating expenses | required |
| 6 | Competitor names | "None" skips next |
| 7 | Per-competitor pricing tier + audience | auto-skipped if no competitors |
| 8 | Customer list (10–30 regulars) | Skip allowed |
| 9 | Product/menu list (top 5–10 items) | Skip allowed |
| 10 | Supplier list | Skip allowed |
| 11 | Bulk import: Excel upload OR pasted ledger | Skip allowed |

Step 11 has three paths: pick an Excel/CSV file (LLM auto-detects columns), paste plain text (LLM extracts facts), or skip and go straight to the app.

### 5.2 Daily data capture

Five capture surfaces feed the same fact extraction pipeline:

- **Voice:** Record button on the center dock → upload → Gemini transcribes → Gemini extracts facts → user confirms.
- **Manual entry:** Single-fact form (kind + description + amount + counterparty).
- **Text paste:** Pasted ledger / forwarded Viber message → Gemini extracts → bulk insert.
- **Excel/CSV import:** File picker (`.xlsx`/`.xls`) → backend parses with `xlsx` → Gemini detects column roles → user confirms mapping → batch insert.
- **(Future)** PDF receipt ingest, Telegram bot, photo OCR.

All capture paths converge on the **fact** schema:

```
kind: "sale" | "expense" | "receivable" | "note"
amountMmk: integer | null
description: string (≤200 chars, any script)
counterparty: string | null
occurredAt: timestamp
```

### 5.3 Home screen

Vertical regions (top to bottom):
1. **Header** — date in mono caps + Burmese greeting using owner name.
2. **Profile completeness nudge** — banner banner if any AI-context field is missing; tap to open Profile editor.
3. **Daily summary** — "Today you sold X" + delta vs yesterday in Burmese.
4. **Hero metric** — single large serif number for the metric the owner chose (today sales / week sales / month revenue / outstanding receivables).
5. **Alert chips** — outstanding receivables chip and "expenses > sales today" chip.
6. **Recent entries** — 5 most-recent confirmed facts with swipe-to-delete.

### 5.4 Reports screen

1. **Week strip** — 7-day sales+expenses bar mini-chart.
2. **Month summary** — sales, expenses, net (color-coded sage / critical).
3. **Category breakdown** — sales / expense / receivable counts + amounts.
4. **Top customers** — month-window ranking with proportional bars.
5. **Receivables list** — open balances, oldest first.

### 5.5 Analytics screen (AI insights)

**Opt-in:** Initial state shows a "Generate AI insights" CTA card. AI doesn't fire until tapped. Subsequent visits reuse the cached blob instantly; a "Regenerate" link in the top-right forces a fresh run.

Once generated, the overview screen shows 4 summary widgets:
- **AI headline** (one sentence diagnosis).
- **Growth score + Market score** (0–100 each, color-tiered green/amber/red).
- **Risk card** (low/medium/high + Burmese reasoning).

Plus 4 navigation cards that drill into sub-pages:
- `/analytics/trend` — 14-day revenue bars + 7-day forecast.
- `/analytics/swot` — single-column SWOT (Strengths / Weaknesses / Opportunities / Threats).
- `/analytics/segments` — customer segments (loyal / occasional / one-time / walk-in).
- `/analytics/recommendations` — 4 themed AI recommendations (promotion / stock / pricing / growth) with numbered action steps.

### 5.6 Profile screen

- Avatar + business name + owner name.
- **Business profile** section — sub-pages for the editable profile fields.
- **Data** section — link to "Import sales (Excel)" reachable post-onboarding.
- Sign out.

---

## 6. Data layers and what feeds the AI

| Layer | When captured | Fields | Powers |
|---|---|---|---|
| **Business profile** | Once (onboarding wizard), editable later | name, type, product/service, location, monthly target, biggest challenge, monthly budget, monthly expenses, POS status, sales periods + values, competitors + tier + audience | SWOT, market targeting, segmentation, marketing plan |
| **Day-1 seeds** | Once (wizard steps 8–10) | customer list, product/menu list, supplier list | Customer segment baseline, product-tagging of future sales, supplier-signal detection |
| **Historical bulk** | Once (wizard step 11 or Profile → Import sales) | full sales rows from Excel/CSV/text | Forecast accuracy, multi-month trends |
| **Daily ongoing** | Continuous (voice/manual/paste) | sale / expense / receivable / note facts | All Home/Reports/Analytics surfaces |

The AI insights pipeline reads both the profile layer and the daily layer to produce strategic context — without the profile layer the recommendations would be generic.

---

## 7. AI architecture

```
Mobile app (Expo)
  │ POST /api/mobile/v1/*  (Bearer: Supabase JWT)
  ▼
Next.js backend
  │ GeminiProvider.structured(prompt, zodSchema)
  │ httpOptions.baseUrl = GEMINI_PROXY_URL  (Supabase Edge Function)
  ▼
Supabase Edge Function (gemini-proxy)
  │ Inject GEMINI_API_KEY secret + forward
  ▼
Google Gemini 2.5 Flash
```

**Insights caching:** `workspaces.insightsJson` stores the latest StrategicInsights blob with a `generatedAt` timestamp. `/insights` returns the cached blob in ~50ms. If stale (>6h), a background regen triggers without blocking. Background regen is also triggered after every facts mutation (confirm + delete) so the cache stays fresh.

**Retry logic:** `gemini.structured()` retries upstream 5xx / 429 / "high demand" responses 3 times with exponential backoff (0.8s → 1.6s → 3.2s).

---

## 8. Success criteria for v1

A v1-ready Strivo passes this acceptance test on a real Myanmar MSME owner's phone:

1. Owner installs Strivo from internal TestFlight / Play Store.
2. Signs in with Google account → 11-step wizard → lands on Home.
3. Records a 30-second Burmese voice note about today's sales.
4. Sees the transcript within 15 seconds and 1–4 extracted facts within 5 more seconds.
5. Confirms; returns to Home; hero metric reflects the sales.
6. Opens Analytics → taps Generate → within 30 seconds sees Burmese AI summary, scores, SWOT, and 4 recommendations.
7. Forwards a Viber-style supplier message into Step 11 paste → AI extracts → continues to home.
8. The next day, opens Reports → sees yesterday's bar in the week strip.
9. All Burmese script renders without tofu (□) on both iOS and Android.
10. Network or LLM failures show a Burmese error with a clear retry path.

If all 10 hold, v1 ships.

---

## 9. What's deliberately not built (v1)

- Telegram bot ingestion.
- PDF invoice parsing.
- Photo OCR.
- Goals & Budget screen (UI components exist conceptually but the screen isn't wired).
- Customer/supplier detail sub-screens (entities are stored but no dedicated browser).
- Real-time chat with the AI ("talk this through").
- Dark mode.
- Multi-user workspaces.
- Per-language toggle to English UI.

These are tracked for v1.1+ in the original build plan and design.md.

---

## 10. Risks

- **Validation gap:** No real-user validation has been done. Biggest risk is wrong product, not wrong implementation.
- **AI cost:** Every Analytics generation is one Gemini Flash call (~$0.001–$0.005). Cache makes ongoing cost trivial.
- **Voice quality:** Gemini transcription quality on Burmese has not been measured against real ambient-noise recordings.
- **Excel format diversity:** The LLM column detector handles the common case but will fail on heavily merged-cell or multi-header Excel files. Manual mapping override exists.
- **Onboarding length:** 11 steps is long for a fresh user. Steps 8–11 are all skippable; steps 1–7 are required.

---

End of PRD v1.
