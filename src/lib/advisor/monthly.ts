// Monthly Profit Advisor — pure, deterministic logic (no DB, no LLM).
//
// Strivo's pilot owners enter data in monthly batches, so the Home advisor works
// on a MONTH clock and shows the most-recent month that has data (the route
// resolves which month via max(occurredAt); see home/route.ts). This module
// turns plain monthly aggregates into a profit review: health status, a
// snapshot, a deterministic "why it changed" diagnosis, ≤2 alerts, and ≤3 keyed
// actions. Keeping it pure makes it trivially unit-testable — the thing trust
// depends on.
//
//   aggregates ──▶ buildAdvisor ──▶ { confidence, health, snapshot,
//                                      diagnosis, alerts, actions }
//
// All user-facing strings are simple Burmese (see Product Language Rules in
// advisor-home-v1-design.md). Amounts are formatted with formatCurrency.

import { formatCurrency } from "@/lib/format";

// ── Types ─────────────────────────────────────────────────────────────────────

export type InsightConfidence = "insufficient" | "partial" | "enough";
export type BusinessHealthStatus = "good" | "watch" | "at_risk";

// Stable keys for the action loop — NEVER the localized title, so act-rate can be
// aggregated by advice type across months and survives copy edits.
export type ActionKey =
  | "review_top_expense"
  | "follow_up_receivables"
  | "record_more"
  | "keep_recording";

export interface MonthAgg {
  salesMmk: number;
  expensesMmk: number;
}

export interface AdvisorInput {
  /** Most-recent month that has data. */
  thisMonth: MonthAgg;
  /** The month before it; null when there is no prior month with data. */
  lastMonth: MonthAgg | null;
  /** Outstanding receivables (current). */
  outstandingMmk: number;
  /** Biggest expense category name this month, if any. */
  topExpenseCategory: string | null;
  /** Latest occurredAt ISO (for the "data through" staleness line). */
  dataThrough: string | null;
  /** The reviewed month as YYYY-MM. */
  periodMonth: string;
  /** Transaction count in the reviewed month (drives confidence). */
  txCount: number;
}

export interface AdvisorAction {
  key: ActionKey;
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

export interface AdvisorAlert {
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
}

export interface AdvisorHome {
  confidence: InsightConfidence;
  periodMonth: string;
  dataThrough: string | null;
  health: { status: BusinessHealthStatus; title: string; explanation: string };
  snapshot: { salesMmk: number; expensesMmk: number; profitMmk: number };
  diagnosis: { title: string; explanation: string } | null;
  alerts: AdvisorAlert[];
  actions: AdvisorAction[];
}

// ── Month-window helpers (single source of truth — see CQ1) ────────────────────

/** Start of the month containing `d`, and start of the next month. UTC. */
export function monthBounds(d: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return { start, end };
}

/** The month immediately before the given month bounds. Handles Dec→Jan. */
export function priorMonthBounds(bounds: { start: Date }): { start: Date; end: Date } {
  const s = bounds.start;
  const start = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() - 1, 1));
  return { start, end: s };
}

/** YYYY-MM for a date (UTC). */
export function ym(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// ── Burmese copy ───────────────────────────────────────────────────────────────

const COPY = {
  health: {
    good: { title: "ကောင်းမွန်", explain: "လုပ်ငန်း အခြေအနေ ကောင်းနေပါသည်။" },
    watch: { title: "သတိထား", explain: "အမြတ် ရှိနေသေးသော်လည်း ဂရုစိုက်ရန် ရှိပါသည်။" },
    at_risk: { title: "အန္တရာယ်", explain: "လုပ်ငန်း အခြေအနေ စိုးရိမ်ဖွယ် ဖြစ်နေပါသည်။" },
  },
  watchHighExpense: "အမြတ် ရှိသေးသော်လည်း ကုန်ကျစရိတ် များနေပါသည်။",
  atRiskLoss: "ဤလတွင် ကုန်ကျ ရောင်းအားထက် များနေပါသည်။",
  diag: {
    firstMonthTitle: "ပထမဦးဆုံး လ",
    firstMonth: "ဒေတာ ထပ်ဖြည့်ပါ၊ ဘာတွေ ပြောင်းသွားလဲ ပြပါမည်။",
    title: "ဘာကြောင့် ပြောင်းသွားလဲ",
    salesUp: "ရောင်းအား တိုးလာသဖြင့် အမြတ် တိုးလာပါသည်။",
    expDown: "ကုန်ကျ လျော့သဖြင့် အမြတ် တိုးလာပါသည်။",
    salesDown: "ရောင်းအား လျော့သဖြင့် အမြတ် နည်းသွားပါသည်။",
    expUp: "ကုန်ကျ များလာသဖြင့် အမြတ် နည်းသွားပါသည်။",
    both: "ရောင်းအားနှင့် ကုန်ကျ နှစ်ခုလုံး ပြောင်းသဖြင့် အမြတ် ပြောင်းသွားပါသည်။",
    flat: "အမြတ် ပြီးခဲ့သည့်လနှင့် နီးပါး တူပါသည်။",
  },
  alert: {
    highExpenseTitle: "ကုန်ကျစရိတ် များနေသည်",
    highExpenseBody: "ကုန်ကျစရိတ်က ရောင်းအား အများစုကို ယူနေပါသည်။",
    receivableTitle: "ရရန်ကျန် ရှိနေသည်",
  },
  action: {
    reviewExpenseTitle: "အကြီးဆုံး ကုန်ကျအမျိုးအစား ပြန်ကြည့်ပါ",
    followUpTitle: "မပေးရသေးသော ငွေ လိုက်တောင်းပါ",
    recordMoreTitle: "ဒေတာ ဆက်ဖြည့်ပါ",
    keepRecordingTitle: "နေ့စဉ် မှတ်တမ်း ဆက်ထားပါ",
    recordMoreReason: "ပိုကောင်းသော အကြံပြုချက် ရရှိရန် ဒေတာ ပိုလိုအပ်ပါသည်။",
    keepRecordingReason: "လုပ်ငန်း တည်ငြိမ်နေပါသည်၊ ဒေတာများလေ အကြံပြုချက် ကောင်းလေပါ။",
  },
} as const;

function expenseRatioPct(m: MonthAgg): number {
  return m.salesMmk > 0 ? (m.expensesMmk / m.salesMmk) * 100 : m.expensesMmk > 0 ? 100 : 0;
}

// ── Confidence ─────────────────────────────────────────────────────────────────

export function confidenceOf(input: AdvisorInput): InsightConfidence {
  if (input.txCount < 3 || input.thisMonth.salesMmk === 0) return "insufficient";
  if (input.txCount < 10) return "partial";
  return "enough";
}

// ── Status (internal score → word; the word is what the user sees) ─────────────

function statusOf(input: AdvisorInput, confidence: InsightConfidence): BusinessHealthStatus {
  const { thisMonth, lastMonth } = input;
  const profit = thisMonth.salesMmk - thisMonth.expensesMmk;
  let score = 70;
  if (profit > 0) score += 10;
  if (profit < 0) score -= 20;
  if (expenseRatioPct(thisMonth) > 70) score -= 15;
  if (lastMonth) {
    if (thisMonth.salesMmk < lastMonth.salesMmk) score -= 10;
    if (thisMonth.salesMmk > lastMonth.salesMmk) score += 10;
  }
  if (thisMonth.salesMmk === 0) score -= 10;
  if (confidence !== "enough") score -= 10;
  score = Math.max(0, Math.min(100, score));
  return score >= 75 ? "good" : score >= 45 ? "watch" : "at_risk";
}

function healthExplanation(status: BusinessHealthStatus, input: AdvisorInput): string {
  const profit = input.thisMonth.salesMmk - input.thisMonth.expensesMmk;
  if (status === "at_risk" && profit < 0) return COPY.atRiskLoss;
  if (status === "watch" && expenseRatioPct(input.thisMonth) > 70) return COPY.watchHighExpense;
  return COPY.health[status].explain;
}

// ── Diagnosis (month vs prior month) ───────────────────────────────────────────

function diagnose(input: AdvisorInput, confidence: InsightConfidence): AdvisorHome["diagnosis"] {
  if (confidence === "insufficient") return null;
  const { thisMonth, lastMonth } = input;
  if (!lastMonth || (lastMonth.salesMmk === 0 && lastMonth.expensesMmk === 0)) {
    return { title: COPY.diag.firstMonthTitle, explanation: COPY.diag.firstMonth };
  }
  const profitNow = thisMonth.salesMmk - thisMonth.expensesMmk;
  const profitPrev = lastMonth.salesMmk - lastMonth.expensesMmk;
  const dProfit = profitNow - profitPrev;
  const dSales = thisMonth.salesMmk - lastMonth.salesMmk;
  const dExp = thisMonth.expensesMmk - lastMonth.expensesMmk;

  // "About the same" when profit barely moved (< 5% of prior, abs).
  const flatThreshold = Math.max(1, Math.abs(profitPrev) * 0.05);
  if (Math.abs(dProfit) < flatThreshold) {
    return { title: COPY.diag.title, explanation: COPY.diag.flat };
  }

  const salesDominant = Math.abs(dSales) >= Math.abs(dExp);
  let explanation: string;
  if (dProfit > 0) {
    explanation = salesDominant ? COPY.diag.salesUp : COPY.diag.expDown;
  } else {
    explanation = salesDominant ? COPY.diag.salesDown : COPY.diag.expUp;
  }
  // Both moved meaningfully and in opposing directions → "both" message.
  if (Math.abs(dSales) > 0 && Math.abs(dExp) > 0 && Math.abs(Math.abs(dSales) - Math.abs(dExp)) < flatThreshold) {
    explanation = COPY.diag.both;
  }
  return { title: COPY.diag.title, explanation };
}

// ── Alerts (≤2) ────────────────────────────────────────────────────────────────

function alertsOf(input: AdvisorInput): AdvisorAlert[] {
  const alerts: AdvisorAlert[] = [];
  if (expenseRatioPct(input.thisMonth) > 70 && input.thisMonth.salesMmk > 0) {
    alerts.push({ severity: "warning", title: COPY.alert.highExpenseTitle, body: COPY.alert.highExpenseBody });
  }
  if (input.outstandingMmk > 0) {
    alerts.push({
      severity: "info",
      title: COPY.alert.receivableTitle,
      body: `${formatCurrency(input.outstandingMmk)} ရရန် ကျန်နေပါသည်။`,
    });
  }
  return alerts.slice(0, 2);
}

// ── Actions (≤3, keyed, priority-ordered) ──────────────────────────────────────

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

function actionsOf(input: AdvisorInput, confidence: InsightConfidence): AdvisorAction[] {
  const actions: AdvisorAction[] = [];
  const ratio = Math.round(expenseRatioPct(input.thisMonth));

  if (ratio > 70 && input.thisMonth.salesMmk > 0) {
    const cat = input.topExpenseCategory ? `${input.topExpenseCategory} — ` : "";
    actions.push({
      key: "review_top_expense",
      title: COPY.action.reviewExpenseTitle,
      reason: `${cat}ကုန်ကျစရိတ်က ရောင်းအား၏ ${ratio}% ဖြစ်နေပါသည်။`,
      priority: "high",
    });
  }
  if (input.outstandingMmk > 0) {
    actions.push({
      key: "follow_up_receivables",
      title: COPY.action.followUpTitle,
      reason: `${formatCurrency(input.outstandingMmk)} မပေးရသေးပါ။`,
      priority: "high",
    });
  }
  if (confidence !== "enough") {
    actions.push({
      key: "record_more",
      title: COPY.action.recordMoreTitle,
      reason: COPY.action.recordMoreReason,
      priority: "medium",
    });
  }
  if (actions.length === 0) {
    actions.push({
      key: "keep_recording",
      title: COPY.action.keepRecordingTitle,
      reason: COPY.action.keepRecordingReason,
      priority: "low",
    });
  }
  return actions.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]).slice(0, 3);
}

// ── Entry point ────────────────────────────────────────────────────────────────

export function buildAdvisor(input: AdvisorInput): AdvisorHome {
  const confidence = confidenceOf(input);
  const status = statusOf(input, confidence);
  const profitMmk = input.thisMonth.salesMmk - input.thisMonth.expensesMmk;
  return {
    confidence,
    periodMonth: input.periodMonth,
    dataThrough: input.dataThrough,
    health: { status, title: COPY.health[status].title, explanation: healthExplanation(status, input) },
    snapshot: { salesMmk: input.thisMonth.salesMmk, expensesMmk: input.thisMonth.expensesMmk, profitMmk },
    diagnosis: diagnose(input, confidence),
    alerts: alertsOf(input),
    actions: actionsOf(input, confidence),
  };
}
