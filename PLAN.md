# Strivo Roadmap Rewrite: Advisor Home First

## Summary

Strivo should not roadmap itself as “data entry app → AI CFO” yet. The current app already has reports, AI insights, forecast notes, recommendations, and scenarios. The real gap is trust: the owner needs one clear diagnosis, why it happened, and what to do next.

The new strategy: build a **Profit Clarity Advisor Home** for pilot/PMF first, with minimal extra data entry. Product intelligence, forecasting, benchmarks, and multi-agent AI should come later only after the app proves owners return weekly and act on recommendations.

## Rewritten Roadmap

**Phase 0: Decision Map And Confidence Rules**
- Create `Data → Insight → Decision → Required Confidence` for every collected field.
- Remove or defer fields that do not change advice, prioritization, or personalization.
- Add rules for when Strivo must say “not enough data yet” instead of generating confident advice.
- Default: no heavy new data entry; ask only small follow-up questions when an insight needs it.

**Phase 1: Advisor Home V1**
- Replace the dashboard-first Home with:
  - Profit Health: “Good / Watch / At Risk” plus optional 0-100 internal score.
  - Today’s Snapshot: sales, expenses, profit.
  - Why It Changed: top deterministic reason, not vague AI text.
  - AI Alerts: only actionable alerts.
  - Top 3 Actions: simple weekly actions with expected benefit when defensible.
- Make the first user promise: “Open Strivo and know if you made money, what changed, and what to do next.”

**Phase 2: Action Loop**
- Every recommendation should support `planned`, `done`, `skipped`, or `not useful`.
- Track whether owners act on advice; this becomes more important than chart usage.
- Use feedback to improve recommendation quality and remove low-value advice categories.
- Weekly habit target: owner opens Strivo at least once per week to review actions.

**Phase 3: Lightweight Diagnostics**
- Build deterministic explanations before adding more AI:
  - Profit changed because revenue changed, expenses changed, or mix changed.
  - Revenue changed because volume, product descriptions, customer concentration, or day patterns changed.
  - Expenses changed by category.
- LLM role: translate the diagnosis into simple Burmese and suggest actions.
- Avoid unsupported causal claims like repeat customers, inventory shortage, or cash runway unless the data exists.

**Phase 4: Product Intelligence, Only After Structured Product Capture**
- Current product data is too weak for real product profitability.
- First add lightweight structure: canonical product name, quantity when available, sale amount, optional cost/margin prompt.
- Start with “best sellers” and “declining products.”
- Only show “most profitable” after cost or margin data exists.
- Do not build inventory forecasts until inventory is actually tracked.

**Phase 5: Goal-Aware Advice**
- Move this earlier than the original roadmap’s Phase 6.
- During onboarding or profile edit, capture one primary goal:
  - increase profit
  - increase revenue
  - reduce costs
  - improve cash flow
  - prepare to expand
- Use the goal to rank alerts and actions, not to generate separate generic reports.

**Phase 6: Simple Forecasts**
- Keep forecasts humble:
  - next-week revenue
  - next-week expenses
  - likely profit range
- Show confidence and data sufficiency.
- Do not show cash runway without cash balance, payables, or obligations.
- Do not show inventory forecast without inventory or product quantity history.

**Phase 7: Benchmarks**
- Start with internal benchmarks:
  - this week vs usual week
  - this month vs previous month
  - this product vs average product
- External peer benchmarks should wait until enough normalized businesses exist.
- Every external benchmark must show sample size/confidence, otherwise it will damage trust.

**Phase 8: AI CFO Experience**
- Treat “multi-agent” as an internal architecture option, not a product phase.
- User-facing deliverable: reliable answers to business questions.
- Agents are only justified once deterministic metrics, action tracking, and confidence rules are stable.

## Interface And Data Changes

- Home interface becomes `Advisor Home`, not a metric dashboard.
- New product concepts to introduce gradually:
  - `BusinessHealth`: status, score, factors, confidence.
  - `AdvisorAlert`: issue, evidence, severity, recommended action.
  - `AdvisorAction`: action, expected impact, risk, status.
  - `InsightConfidence`: enough data, partial data, insufficient data.
- No full product/inventory/accounting schema should be added in the first milestone.
- Product profitability must not be exposed until product cost or margin data exists.

## Success Metrics

Optimize for:
- weekly active businesses
- number of businesses with fresh weekly data
- actions marked planned/done
- recommendation usefulness feedback
- retention after first useful recommendation
- owner-reported profit/revenue improvement

Do not optimize for:
- number of charts
- number of AI pages
- number of prompts
- complexity of agent architecture

## Assumptions

- Stage: pilot / product-market fit.
- First priority: Advisor Home.
- Primary lens: profit clarity.
- Data-entry tolerance: very low.
- Default product rule: ask less, infer carefully, show confidence, and avoid pretending Strivo knows things it does not.
