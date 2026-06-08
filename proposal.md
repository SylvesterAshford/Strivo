# Strivo — Project Proposal

**Your business, finally making sense.**

Strivo is a Burmese-first, AI-powered business assistant for Myanmar's micro,
small, and medium enterprises (MSMEs). A shop owner logs sales and expenses three
ways (Excel import, paste-text, or manual entry), and Strivo turns raw
transactions into financial reports and AI strategic advice — in Burmese, on any
phone or desktop browser, with zero accounting knowledge required.

---

## 1. The problem

Myanmar has 1M+ MSMEs, overwhelmingly unserved by digital finance tools. The shop
owner's reality:

- Records live in a paper book, a Viber chat, or their head.
- Existing tools (QuickBooks, Wave, Xero) are built for accountants, in English,
  and assume double-entry bookkeeping.
- A bookkeeper costs $200+/month, out of reach for a tea shop or phone-repair stall.

The deeper problem is not missing data. It is that **nobody turns the data into a
decision.** Owners can't easily answer "did I make money this month?", "who owes
me?", or "what happens if I raise prices 10%?"

## 2. The solution

Strivo is the layer that turns a shop's own transactions into decisions, in the
owner's language.

- **Three ways to add data** — import an Excel/CSV ledger (AI detects the columns),
  paste a free-text message or SMS (AI extracts the facts), or type a single entry.
- **Financial reports** — profit & loss, sales/expense breakdown by category, top
  customers, outstanding receivables.
- **AI strategic insights** — growth and market scores, SWOT, customer segments, a
  7-day sales forecast, and concrete recommendations (promotion, stock, pricing,
  growth).
- **What-if scenario explorer** — "raise prices 10%?", "cut my biggest expense?" —
  projections grounded in the shop's own data.

Everything is Burmese-first (Noto Sans Myanmar throughout), works on any phone or
desktop, and requires no accounting vocabulary.

## 3. Why now / why us

- **AI makes Burmese-native extraction and advice cheap.** Gemini 2.5 Flash reads
  Burmese ledgers and writes Burmese advice at roughly 1/40th the cost of a
  bookkeeper, and 50-100x cheaper per token than GPT-4-class models for the same
  tasks.
- **The moat is language + distribution, not the code.** A Burmese-native AI
  assistant (not a translated Western tool) plus AI-powered data ingestion is hard
  to copy without the localization investment and a distribution channel.

## 4. Target users

| Segment | Example | Primary need |
|---|---|---|
| Retail shops | tea shop, grocery, clothing | daily sales tracking, who-owes-me |
| Food & beverage | restaurant, street stall | daily revenue, expense control |
| Services | phone repair, salon | receivables, repeat customers |
| B2B trading | small wholesaler | outstanding balances, top buyers |

Shared profile: smartphone-first, low accounting literacy, Burmese-speaking,
price-sensitive, time-poor.

## 5. Product status

- Responsive web app (Next.js 16) — built and functional. One URL, works on any
  phone or desktop browser, nothing to install.
- Backend API + AI pipeline — built and working (financial aggregation, Burmese
  fact extraction, strategic insights, scenarios).
- Marketing landing page — built, live on Vercel (separate `lattice-landing`).
- Brand + design system — complete ("Slate Ink", see `DESIGN.md`).

Honest disclosures:

- Not yet deployed to a public production URL for end users (one Vercel deploy away).
- Pre-revenue, pre-users — this is an asset / early-stage build, not a business with
  traction yet.
- AI runs on Gemini keys; production scale needs a paid key (already supported via
  the multi-key rotation proxy).

## 6. Business model

Freemium, priced in MMK.

| Plan | Monthly (MMK) | Target |
|---|---|---|
| Free | 0 | acquisition / onboarding |
| Standard | 35,000 | everyday shops |
| Premium | 85,000 | growing businesses (highest-revenue tier) |
| Enterprise | 180,000 | large orgs, custom |

Cost to operate is very low (serverless + cheap AI): roughly $1-3/mo at 100 users,
$74-94 at 1,000, $214-600 at 10,000. AI cost is ~$0.02 per active user/month.
Free tiers cover the first ~100 users at near-zero. Gross margin is 97-99% across
all scales at ~$5/user-equivalent pricing.

## 7. Competitive landscape

| Competitor | Strivo's edge |
|---|---|
| QuickBooks / Wave / Xero | built for accountants, English-only → Strivo needs zero accounting, speaks Burmese |
| Excel / paper | only records → Strivo imports them and adds AI advice |
| POS systems | hardware + checkout-only → Strivo works on any phone, any shop |
| A bookkeeper ($200+/mo) | Strivo starts free, available 24/7 |

## 8. Roadmap

1. **Deploy** the web app to production (one Vercel deploy) and share the URL — no
   app-store review needed.
2. **Acquire** the first 100-500 shop owners on the free tier to prove onboarding
   and retention.
3. **Convert** to paid tiers; even 20-50 paying users validates the model.
4. **Partner** for distribution (a bank, telco, or MSME association) — distribution
   is worth more than the app itself.
5. **Scale** AI on a paid Gemini key (already wired through the proxy).

Near-term product bets: real charting (animated area + donut), an offline-tolerant
data-entry mode, and a lightweight "who owes me" reminder loop.

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| AI mis-extracts Burmese facts | user confirms/edits extracted facts before save; lenient JSON parse + retries |
| Network reliability in Myanmar | Gemini routed through a Supabase edge proxy; generous client timeouts |
| Low willingness to pay | free tier proves value first; pricing validated with early cohort |
| Distribution is the real bottleneck | pursue a partner channel early, not paid acquisition |
| Single-AI-vendor dependency | provider abstraction in `src/lib/llm` makes swapping models tractable |

## 10. What drives the value

The code is the floor. Value multiplies with traction:

| Milestone | Effect |
|---|---|
| Code + brand (today) | baseline asset |
| 100-500 active users | ~3-5x baseline |
| 20-50 paying users (proven MRR) | becomes a business, valued on revenue multiple |
| A signed distribution partner | step-change — distribution is the moat |

---

*A clean, modern, niche-focused product with an exceptional cost structure and a
clear localized advantage. The technology is done; the opportunity is distribution.*
