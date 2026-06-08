# Strivo — Business Logic

The domain rules behind the numbers and the AI. This documents *what the system
decides and how it computes*, grounded in the implementation
(`src/app/api/mobile/v1/*`, `src/lib/insights/*`, `src/lib/extraction/*`,
`src/lib/finish-onboarding.ts`). Pair with `spec.md` (what) and `ARCHITECTURE.md`
(how it's wired).

---

## 1. Domain model

One **user** owns one **workspace**; all business data hangs off the workspace as
**facts**.

A **fact** is the atomic unit of everything Strivo knows:

| Field | Meaning |
|---|---|
| `kind` | `sale` · `expense` · `receivable` · `note` |
| `amountMmk` | integer MMK (no decimals); `null` for notes |
| `description` | free text (Burmese) |
| `category` | expense bucket (e.g. ဆိုင်ခ, လုပ်ခ); optional, expenses only |
| `counterparty` | customer (sales) or supplier (expenses); optional |
| `occurredAt` | the **business date** the event happened, NOT insert time |

Kind semantics:
- **sale** — money in. Drives revenue, week/month sales, top customers.
- **expense** — money out. Drives expense totals and category breakdown.
- **receivable** — money owed to the shop (sold on credit). Drives "outstanding".
- **note** — a reminder with no amount (e.g. "restock eggs tomorrow"). Shows in the
  feed, excluded from money math.

**Why `occurredAt` not `createdAt`:** a shop importing a month-old ledger must have
those sales reported on the day they happened, so reports stay truthful.

## 2. Home metrics (rolling windows)

Computed in `home/route.ts` by summing `amountMmk` over windows ending at "now":

| Metric | Rule |
|---|---|
| `todaySalesMmk` | sum of `sale` with `occurredAt` in [today 00:00, tomorrow 00:00) |
| `todayExpensesMmk` | same window, `kind = expense` |
| `yesterdaySalesMmk` | `sale` in the prior day |
| `weekSalesMmk` | `sale` over the **rolling last 7 days** (incl. today) |
| `monthRevenueMmk` | `sale` over the **rolling last 30 days** |
| `outstandingMmk` | `receivable` over the rolling last 30 days |
| `recentToday` | latest 8 facts dated today |
| `recentFallback` | latest 8 facts of any date (shown when today is empty) |

`null` sums coerce to `0`. The home feed is never blank for an account with history
(falls back to recent entries).

### Hero metric + daily delta
- The hero number defaults by business type: **services / b2b_trading → outstanding**;
  everything else → **today's sales** (`finish-onboarding.ts:defaultHero`).
- Daily summary headline cascades: today's sales if > 0, else this week, else this
  month, else "no sales yet".
- Delta vs yesterday: `pct = round((today - yesterday) / yesterday * 100)`. Shows
  "up X%" / "down X%" / "same"; suppressed when yesterday ≤ 0.
- Alert chips fire when `outstanding > 0`, and when `todayExpenses > todaySales > 0`.

## 3. Reports (calendar month)

Computed in `reports/route.ts`. **Note the deliberate difference from Home:** reports
use the **calendar month** (from the 1st), while Home uses rolling windows. Home
answers "how am I doing right now"; Reports answer "how did this month go".

| Block | Rule |
|---|---|
| Week strip | last 7 days, `sale`+`expense` summed per day (`date_trunc('day')`) |
| Month totals | calendar month: `salesMmk`, `expensesMmk`, `netMmk = sales − expenses` |
| Top customers | calendar month, `sale` with non-null counterparty, grouped, top 5 by sum |
| Category breakdown | calendar month, summed per `kind` |
| Expense categories | calendar month, `expense` summed per `category` ("Other" when blank) |
| Receivables | all `receivable` facts, oldest first, up to 20 |

## 4. Strategic insights (AI, `src/lib/insights/strategic.ts`)

Two layers: **deterministic metrics** computed in code, then **judgment** generated
by Gemini from those metrics (never invented from raw rows). The report is cached
per workspace and regenerated on demand.

### 4.1 Deterministic metrics (`computeMetrics`, 30-day window)
- `totalSalesMmk`, `totalExpensesMmk`, `netProfitMmk = sales − expenses`.
- `profitMarginPct = net / sales × 100`.
- `expenseRatioPct = expenses / sales × 100`.
- `salesTrendPct` = recent half vs prior half of the window:
  `(recentSales − priorSales) / priorSales × 100` (100% if prior is 0 and recent > 0).
- `avgDailySalesMmk = totalSales / periodDays`.
- `customerConcentrationPct` = top customer's share of sales (single-customer risk).
- `dailySeries` = up to the last 14 days of sales/expenses.
- `salesForecast` (7 days) = project from the recent daily average, sloped by a
  trend factor `clamp(salesTrendPct/100, −0.5, +0.5)`.
- `customerSegments` by purchase frequency in the window:
  - **loyal** = counterparty with ≥ 3 purchases
  - **occasional** = exactly 2
  - **oneTime** = exactly 1
  - **walkIn** = sales with no counterparty (revenue only, no customer count)

### 4.2 AI judgment (Gemini, Zod-validated)
From the metrics, Gemini produces:
- `headline` — one-line Burmese read of the business.
- `growthScore` (0-100) — momentum: trend + profit + volume.
- `marketScore` (0-100) — potential: customer diversity + repeat demand + market context.
- `riskLevel` (low/medium/high) + `riskReason` — the single biggest risk.
- `swot` — strengths / weaknesses / opportunities / threats.
- `forecastNote` — plain-Burmese reading of the 7-day forecast.
- `recommendations` — promotion / stock / pricing / growth, each with a title,
  advice, and steps.

All text fields are written in simple Burmese. Output is validated against a Zod
schema with a correction retry; lenient JSON parsing recovers partial/truncated
responses.

## 5. Scenario engine (`/insights/scenario`)

A what-if ("raise prices 10%?") is answered against the **cached insights report**
(so it's grounded in the same metrics). Returns: `headline`, `estimatedImpact`
(`salesPct`, `marginPct`, `risk`), `watchFor`, `steps`, `caveats`. Results are
cached ~30 minutes to avoid duplicate LLM calls. If the model is overloaded
(429/503/UNAVAILABLE), the UI shows a retry affordance rather than a hard failure.

## 6. Data ingestion rules

All three paths produce `facts`.

### Excel/CSV import
1. Upload → backend parses the sheet (SheetJS).
2. Gemini detects the **column mapping** (which column is date / customer / amount /
   product / quantity for sales; date / amount / category / description /
   counterparty for expenses).
3. User confirms or corrects the mapping (a column can be mapped to "none" = −1).
4. Confirm → bulk insert. Import is blocked until an `amount` column is mapped.

### Text paste
- A free-text ledger or SMS goes to Gemini, which extracts structured facts. The
  user reviews/edits before save. Burmese-fact extraction runs with retries and a
  generous timeout.

### Manual entry
- One fact at a time. Amount applies to sale/expense/receivable (not note). Category
  shows for expenses, with quick-pick chips from the saved expense categories.

### Parsing conventions
- **Burmese digits → ASCII** before parsing numbers (၀-၉ → 0-9).
- **Caps** to keep profiles sane: products ≤ 50, suppliers ≤ 30, expense categories
  ≤ 20, customer/competitor lists ≤ 50.
- **Product dedup** on save: case-insensitive by name, merged with the existing
  catalogue (existing items win, new ones appended up to the cap).
- List fields parse one item per line (or comma/Burmese-comma separated); "name :
  value" splits name from price/amount/supplies.

## 7. Onboarding & profile completeness

- The 10-step wizard writes into an in-memory draft (`stores/onboarding`); the final
  step flushes it to the backend via `PUT /profile`.
- **Optimistic completion:** `finishOnboarding` mirrors the draft into the local
  profile store, flips `onboarded = true` immediately so the user lands on Home, and
  saves to the backend in the background (failures are logged, never block the user).
- **`onboarded` (from backend)** = the workspace already has profile data (returning
  or seeded user). On sign-in, if the backend is unreachable, the user is treated as
  onboarded rather than trapped in the wizard.
- **Profile-completeness nudge** (Home) shows while ANY AI-relevant field is missing:
  productService, businessType, salesPeriods, salesValues, monthlyExpenses,
  competitors, customers, products, suppliers. The nudge is how missing context gets
  filled after a fast onboarding.

## 8. Auth & isolation

- A request is authenticated by its Supabase bearer JWT (validated server-side via
  `auth.getUser`), OR by `AUTH_BYPASS` which returns a stub `dev_local_user`.
- `getOrCreateMobileWorkspace` maps the user to a workspace, creating the `users` and
  `workspaces` rows on first sign-in (one workspace per owner).
- Every authed request runs inside a transaction with `app.user_id` and
  `app.workspace_id` set; Postgres RLS policies then guarantee a request can only
  read/write rows for its own workspace, regardless of route code.
- `AUTH_BYPASS` defaults to **false in production** on both server and client
  (explicit `true`/`false` wins; otherwise gated on `NODE_ENV`). A failed API call
  surfaces as an error/retry state, never as a fake "empty account".

## 9. Presentation rules worth knowing

- **Currency** (`formatCurrency`): `< 1,000` → raw ("850 MMK"); `< 100k` → "85K";
  `< 1M` → "850K"; `< 10M` → "8.5M"; `≥ 10M` → "1.2Cr" (1 crore = 10,000,000).
  Trailing ".0" trimmed; Arabic numerals always; MMK unit.
- **Dates/labels**: English day/month codes for mono eyebrows ("MON · 8 JUN"); all
  other copy is Burmese.

## 10. Monetization rules (designed)

Freemium, MMK: Free 0 · Standard 35,000 · Premium 85,000 · Enterprise 180,000 /mo.
Plan gating is a product decision not yet enforced in code; the data model and AI
cost profile (~$0.02/active user/mo) support it directly. (Billing is out of scope
for v1 — see `spec.md` §11.)
