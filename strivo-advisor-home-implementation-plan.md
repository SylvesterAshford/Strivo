# Strivo Advisor Home Implementation Plan

## Core Idea

Strivo should stop saying:

> Here are your numbers.

It should start saying:

> Here is what is happening in your business, here is why, and here is what to do next.

The first milestone is **Advisor Home V1**.

This is not the full AI CFO. It is a clear, trustworthy home screen that helps a Myanmar small business owner understand profit, problems, and next actions quickly.

The owner should be able to open Strivo and answer four questions:

1. Am I making money?
2. What changed recently?
3. What problem should I watch?
4. What should I do next?

The most important product rule:

> Can a tired shop owner understand this in 5 seconds?

If not, the message is too complicated.

---

## What The Home Screen Should Show

Advisor Home V1 should replace the dashboard-first layout with this structure:

```text
Business Health
Watch
Profit is positive, but expenses are getting high.

Last Week / Last 7 Days
Sales: 120,000 MMK
Expenses: 75,000 MMK
Profit: 45,000 MMK

Why It Changed
Profit is lower because expenses increased compared with last week.

Alerts
- Expenses are taking 63% of sales.
- 1 customer owes 80,000 MMK.

Recommended Actions
1. Review your biggest expense category this week.
2. Follow up unpaid money.
3. Keep recording sales daily for better advice.
```

The home screen should feel like a business control center, not a report page.

---

## Important Simplification

Do not make this an AI-heavy feature at first.

Most of Advisor Home V1 should be calculated from business numbers:

- sales increased or decreased
- expenses increased or decreased
- profit is positive or negative
- expense ratio is high or normal
- unpaid receivables exist
- there is not enough data yet

AI can later help turn these facts into better Burmese text, but the first version should be deterministic.

This protects user trust.

---

## Phase 1: Add Advisor Data To The Home API

Current route:

```text
src/app/api/mobile/v1/home/route.ts
```

The route already returns:

- today sales
- today expenses
- yesterday sales
- week sales
- month revenue
- outstanding receivables
- recent entries

Add a new `advisor` object to the response.

```ts
advisor: {
  confidence: "insufficient" | "partial" | "enough";
  health: {
    status: "good" | "watch" | "at_risk";
    score: number;
    title: string;
    explanation: string;
    factors: string[];
  };
  snapshot: {
    salesMmk: number;
    expensesMmk: number;
    profitMmk: number;
  };
  diagnosis: {
    title: string;
    explanation: string;
  };
  alerts: {
    severity: "info" | "warning" | "critical";
    title: string;
    body: string;
    actionLabel?: string;
  }[];
  actions: {
    title: string;
    reason: string;
    expectedImpact?: string;
    priority: "high" | "medium" | "low";
  }[];
}
```

This gives the frontend one clean object to render.

Do not remove the old fields yet. Keep them for compatibility.

---

## Phase 2: Business Health Rules

Business Health should be simple and explainable.

Statuses:

```text
Good
Watch
At Risk
```

Do not lead with a mysterious score. The score can exist internally, but the user should first see the plain explanation.

Bad:

```text
Business Health: 62/100
```

Better:

```text
Watch
You are still profitable, but expenses are getting high.
```

### Suggested Score Rules

Start at:

```text
70
```

Adjust:

```text
+10 if profit is positive
-20 if profit is negative
-15 if expenses are more than 70% of sales
-10 if sales dropped compared with the previous 7 days
-10 if no sales were recorded this week
-10 if confidence is low
+10 if sales are growing
```

Convert score to status:

```text
75-100 = Good
45-74  = Watch
0-44   = At Risk
```

The explanation matters more than the score.

---

## Phase 3: Confidence Rules

Strivo must know when not to overclaim.

Use three confidence levels:

```ts
"insufficient" | "partial" | "enough"
```

### Insufficient

Use when:

- fewer than 3 financial facts exist, or
- no sales exist in the last 30 days

Message:

```text
There is not enough recent data yet. Record sales and expenses for a few more days.
```

### Partial

Use when:

- some data exists, but
- fewer than 7 active days, or
- fewer than 10 transactions

Message:

```text
Advice is limited because Strivo has only a small amount of recent data.
```

### Enough

Use when:

- at least 7 active days exist, and
- at least 10 transactions exist

Message:

```text
Strivo has enough recent data to give basic advice.
```

Confidence should affect both the health explanation and recommended actions.

---

## Phase 4: Today Snapshot

The snapshot should be extremely clear:

```text
Sales
Expenses
Profit
```

Calculate:

```ts
profitMmk = todaySalesMmk - todayExpensesMmk;
```

If there are no entries today but historical data exists, the home screen can still show recent business health, but the Today section should honestly say there is no data today.

Do not hide this.

---

## Phase 5: Why It Changed

This is the most important part of the new Home.

Compare:

```text
Current 7 days
Previous 7 days
```

Calculate:

```text
currentProfit = currentSales - currentExpenses
previousProfit = previousSales - previousExpenses
profitChange = currentProfit - previousProfit
salesChange = currentSales - previousSales
expenseChange = currentExpenses - previousExpenses
```

Then choose the clearest explanation.

### Diagnosis Rules

If there is not enough data:

```text
Record more sales and expenses to see what changed.
```

If profit improved mainly because sales increased:

```text
Profit improved mainly because sales increased.
```

If profit improved mainly because expenses decreased:

```text
Profit improved mainly because expenses decreased.
```

If profit fell mainly because sales decreased:

```text
Profit fell mainly because sales decreased.
```

If profit fell mainly because expenses increased:

```text
Profit fell mainly because expenses increased.
```

If both sales and expenses moved:

```text
Profit changed because both sales and expenses changed.
```

Avoid unsupported explanations such as:

- weekend traffic increased
- repeat customers increased
- inventory is low
- cash will run out
- product demand changed

Only say those when the app has the required data.

---

## Phase 6: Alerts

Alerts should be actionable. Do not show alerts just to fill space.

Use a maximum of 3 alerts.

Suggested alert rules:

### High Expense Ratio

Condition:

```text
expenses are more than 70% of sales
```

Message:

```text
Expenses are taking most of your sales.
```

### Negative Profit

Condition:

```text
expenses are higher than sales
```

Message:

```text
Today or this week is running at a loss.
```

### Receivables Exist

Condition:

```text
outstanding receivables > 0
```

Message:

```text
Some money is still unpaid.
```

### Low Data

Condition:

```text
confidence is insufficient or partial
```

Message:

```text
Record more recent sales and expenses for better advice.
```

---

## Phase 7: Recommended Actions

Actions should be rule-based first.

Show at most 3.

Each action should have:

- title
- reason
- expected impact, only when defensible
- priority

### Example Actions

If expenses are high:

```text
Review your biggest expense category this week.
Reason: Expenses are taking 72% of sales.
```

If sales are down:

```text
Check which sales days were weaker this week.
Reason: Sales are lower than last week.
```

If receivables exist:

```text
Follow up unpaid money.
Reason: 80,000 MMK is still outstanding.
```

If data is weak:

```text
Record sales and expenses for 3 more days.
Reason: Strivo needs more recent data to give better advice.
```

If profit is positive and expenses are controlled:

```text
Keep recording daily sales.
Reason: Your business looks stable, and more data will improve advice.
```

---

## Phase 8: Frontend Redesign

Current Home screen:

```text
src/app/(tabs)/page.tsx
```

Current priority:

- Daily summary
- Hero metric
- KPI tiles
- Alert chips
- Recent entries

New priority:

- Advisor health card
- Today profit snapshot
- Why it changed card
- Alerts
- Recommended actions
- Recent entries

Create these components:

```text
AdvisorHealthCard
TodaySnapshotCard
DiagnosisCard
AdvisorAlerts
AdvisorActions
```

Keep `RecentEntries` near the bottom so the owner can still confirm that their data was recorded.

Use the existing Strivo design system:

- calm white cards
- clear Burmese text
- simple icons
- no decorative clutter
- no complex charts on Home

---

## Phase 9: Frontend Types

Update:

```text
src/lib/api.ts
```

Add types:

```ts
export type InsightConfidence = "insufficient" | "partial" | "enough";

export type BusinessHealthStatus = "good" | "watch" | "at_risk";

export interface BusinessHealth {
  status: BusinessHealthStatus;
  score: number;
  title: string;
  explanation: string;
  factors: string[];
}

export interface AdvisorAlert {
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  actionLabel?: string;
}

export interface AdvisorAction {
  title: string;
  reason: string;
  expectedImpact?: string;
  priority: "high" | "medium" | "low";
}

export interface AdvisorHome {
  confidence: InsightConfidence;
  health: BusinessHealth;
  snapshot: {
    salesMmk: number;
    expensesMmk: number;
    profitMmk: number;
  };
  diagnosis: {
    title: string;
    explanation: string;
  };
  alerts: AdvisorAlert[];
  actions: AdvisorAction[];
}
```

Then add:

```ts
advisor: AdvisorHome;
```

to `HomeData`.

---

## Phase 10: Testing Scenarios

Test these cases manually and with unit tests if possible.

### Empty Account

Expected:

- cold-start experience still works
- no fake advice
- message asks user to record data

### Low Data Account

Expected:

- confidence is `partial` or `insufficient`
- health is cautious
- action says to record more data

### Profitable Account

Expected:

- health is `good` or `watch`
- profit is clearly shown
- recommendations are not alarmist

### Loss Account

Expected:

- health is `at_risk`
- negative profit is clear
- action focuses on expenses or sales recovery

### High Expenses Account

Expected:

- alert appears
- action recommends reviewing expense category

### Receivables Account

Expected:

- unpaid money alert appears
- action recommends follow-up

---

## Phase 11: Action Loop

Do this after Advisor Home V1 is working.

Every recommended action should support:

```text
Plan
Done
Skip
Not useful
```

Create table:

```text
advisor_action_events
```

Fields:

```ts
id
workspaceId
actionKey
actionTitle
status: "planned" | "done" | "skipped" | "not_useful"
createdAt
```

Why this matters:

The goal is not to generate advice.

The goal is to help the owner take useful action.

---

## What Not To Build Yet

Do not build these in the first milestone:

- multi-agent AI CFO
- external benchmarks
- inventory forecast
- cash runway
- product profitability
- complex forecasting
- full accounting system

These features need better data first.

Building them too early will make Strivo sound smart but feel untrustworthy.

---

## Product Language Rules

Strivo should speak like this:

```text
You made profit today.
Expenses are higher than usual.
Follow up unpaid money this week.
```

Not like this:

```text
Your operating margin trend indicates elevated downside exposure due to changing cost structure.
```

Use simple words.

Use short sentences.

Avoid business jargon.

The product wins by being clear, not by sounding smart.

---

## Exact Implementation Order

1. Add advisor calculation helper for Home.
2. Add `advisor` object to `/api/mobile/v1/home`.
3. Update frontend types in `src/lib/api.ts`.
4. Create Advisor Home components.
5. Replace the Home screen layout priority.
6. Keep recent entries at the bottom.
7. Test empty, low-data, profitable, loss, high-expense, and receivables cases.
8. Add action tracking only after the Home experience feels clear.

---

## Final Acceptance Criteria

Advisor Home V1 is successful when:

- the owner can see profit clearly
- the owner can understand business health in one sentence
- the owner can see why profit changed
- the owner gets no more than 3 useful actions
- Strivo admits when there is not enough data
- the screen is understandable in less than 30 seconds

