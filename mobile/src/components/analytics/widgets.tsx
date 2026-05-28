import { View, StyleSheet } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon, type IconName } from "@/components/ui/Icon";
import { colors, spacing, radius } from "@/theme/tokens";
import { formatCurrency } from "@/lib/format";
import { my } from "@/i18n/my";
import type {
  StrategicInsights,
  Recommendation,
  BusinessMetrics,
  Swot,
} from "@/lib/api";

// ── Headline ────────────────────────────────────────────────────────────────

export function Headline({ text }: { text: string }) {
  return (
    <View style={styles.headlineCard}>
      <View style={styles.headlineBadge}>
        <Icon name="sparkles" size={14} color={colors.accent.base} />
        <Eyebrow style={{ marginLeft: 6 }}>AI</Eyebrow>
      </View>
      <AppText variant="serifLg" color="primary" style={{ marginTop: spacing.sm, lineHeight: 46 }}>
        {text}
      </AppText>
    </View>
  );
}

// ── Scores + risk ───────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 67) return colors.semantic.positive;
  if (score >= 34) return colors.semantic.caution;
  return colors.semantic.critical;
}

export function ScoreCard({ label, score }: { label: string; score: number }) {
  const color = scoreColor(score);
  return (
    <View style={styles.scoreCard}>
      <AppText variant="caption" color="secondary" style={{ textAlign: "center" }}>
        {label}
      </AppText>
      <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: spacing.xs }}>
        <AppText variant="serifXl" style={{ color }}>
          {String(score)}
        </AppText>
        <AppText variant="caption" color="tertiary" style={{ marginBottom: 4, marginLeft: 1 }}>
          /100
        </AppText>
      </View>
      <View style={styles.scoreTrack}>
        <View style={[styles.scoreFill, { width: `${score}%` as `${number}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export function RiskCard({ level, reason }: { level: StrategicInsights["riskLevel"]; reason: string }) {
  const map = {
    low: { label: my.analytics.riskLow, color: colors.semantic.positive, icon: "shield-check" as IconName },
    medium: { label: my.analytics.riskMedium, color: colors.semantic.caution, icon: "alert-triangle" as IconName },
    high: { label: my.analytics.riskHigh, color: colors.semantic.critical, icon: "alert-triangle" as IconName },
  }[level];

  return (
    <View style={styles.riskCard}>
      <View style={styles.riskHeader}>
        <View style={[styles.riskIconBox, { backgroundColor: `${map.color}1F` }]}>
          <Icon name={map.icon} size={16} color={map.color} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" color="secondary">
            {my.analytics.riskLevel}
          </AppText>
          <AppText variant="bodyMedium" style={{ color: map.color }}>
            {map.label}
          </AppText>
        </View>
      </View>
      <AppText variant="body" color="secondary" style={{ marginTop: spacing.sm }}>
        {reason}
      </AppText>
    </View>
  );
}

// ── Revenue trend (sales bars) ──────────────────────────────────────────────

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <AppText variant="caption" color="tertiary">
        {label}
      </AppText>
      <AppText variant="bodyMedium" style={color ? { color, marginTop: 2 } : { marginTop: 2 }}>
        {value}
      </AppText>
    </View>
  );
}

export function RevenueTrend({ metrics }: { metrics: BusinessMetrics }) {
  const series = metrics.dailySeries;
  const max = Math.max(...series.map((d) => d.salesMmk), 1);
  const trendUp = metrics.salesTrendPct >= 0;

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
        <Eyebrow>{my.analytics.revenueTrend}</Eyebrow>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Icon
            name={trendUp ? "trending-up" : "trending-down"}
            size={14}
            color={trendUp ? colors.semantic.positive : colors.semantic.critical}
          />
          <AppText
            variant="caption"
            style={{ color: trendUp ? colors.semantic.positive : colors.semantic.critical }}
          >
            {`${trendUp ? "+" : ""}${metrics.salesTrendPct}%`}
          </AppText>
        </View>
      </View>

      <View style={styles.chartRow}>
        {series.map((d, i) => {
          const h = Math.max(4, (d.salesMmk / max) * 64);
          return (
            <View key={i} style={styles.chartCol}>
              <View style={[styles.bar, { height: h }]} />
            </View>
          );
        })}
      </View>

      <View style={styles.metricRow}>
        <Metric label="ဝင်ငွေ" value={formatCurrency(metrics.totalSalesMmk)} />
        <Metric
          label="အမြတ်"
          value={formatCurrency(metrics.netProfitMmk)}
          color={metrics.netProfitMmk >= 0 ? colors.semantic.positive : colors.semantic.critical}
        />
        <Metric label="ပျမ်းမျှ/နေ့" value={formatCurrency(metrics.avgDailySalesMmk)} />
      </View>
    </View>
  );
}

// ── Forecast ────────────────────────────────────────────────────────────────

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
      <AppText variant="caption" color="tertiary">
        {label}
      </AppText>
    </View>
  );
}

export function ForecastCard({ metrics, note }: { metrics: BusinessMetrics; note: string }) {
  const actual = metrics.dailySeries.slice(-7).map((d) => d.salesMmk);
  const forecast = metrics.salesForecast;
  const max = Math.max(...actual, ...forecast, 1);

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.lg }}>
        <Icon name="chart-line" size={14} color={colors.accent.base} />
        <Eyebrow>{my.analytics.forecast}</Eyebrow>
      </View>

      <View style={styles.chartRow}>
        {actual.map((v, i) => (
          <View key={`a${i}`} style={styles.chartCol}>
            <View style={[styles.bar, { height: Math.max(4, (v / max) * 56), backgroundColor: colors.text.tertiary }]} />
          </View>
        ))}
        {forecast.map((v, i) => (
          <View key={`f${i}`} style={styles.chartCol}>
            <View style={[styles.bar, { height: Math.max(4, (v / max) * 56), backgroundColor: colors.accent.base }]} />
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: spacing.lg, marginBottom: spacing.md }}>
        <Legend color={colors.text.tertiary} label="ယခင် ၇ ရက်" />
        <Legend color={colors.accent.base} label="ခန့်မှန်း ၇ ရက်" />
      </View>

      <AppText variant="body" color="secondary">
        {note}
      </AppText>
    </View>
  );
}

// ── SWOT (single-column, readable) ─────────────────────────────────────────

const SWOT_META: { key: keyof Swot; label: string; color: string }[] = [
  { key: "strengths", label: my.analytics.strengths, color: colors.semantic.positive },
  { key: "weaknesses", label: my.analytics.weaknesses, color: colors.semantic.critical },
  { key: "opportunities", label: my.analytics.opportunities, color: colors.accent.base },
  { key: "threats", label: my.analytics.threats, color: colors.semantic.caution },
];

export function SwotPanel({ swot }: { swot: Swot }) {
  return (
    <View style={{ gap: spacing.lg }}>
      {SWOT_META.map((q) => (
        <View key={q.key} style={[styles.swotPanel, { borderTopColor: q.color }]}>
          <AppText variant="bodyMedium" style={{ color: q.color, marginBottom: spacing.md }}>
            {q.label}
          </AppText>
          {swot[q.key].map((item, i) => (
            <View key={i} style={styles.swotItem}>
              <View style={[styles.swotDot, { backgroundColor: q.color }]} />
              <AppText variant="body" color="primary" style={{ flex: 1 }}>
                {item}
              </AppText>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Segments ────────────────────────────────────────────────────────────────

const SEG_LABELS: Record<string, string> = {
  loyal: my.analytics.segLoyal,
  occasional: my.analytics.segOccasional,
  oneTime: my.analytics.segOneTime,
  walkIn: my.analytics.segWalkIn,
};

export function SegmentsCard({ metrics }: { metrics: BusinessMetrics }) {
  const segs = metrics.customerSegments;
  const max = Math.max(...segs.map((s) => s.totalMmk), 1);
  const palette = [colors.semantic.positive, colors.accent.base, colors.chart.dustyRose, colors.text.tertiary];

  return (
    <View style={styles.card}>
      <Eyebrow style={{ marginBottom: spacing.lg }}>{my.analytics.segments}</Eyebrow>
      {segs.map((s, i) => (
        <View key={s.key} style={{ marginBottom: i < segs.length - 1 ? spacing.md : 0 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <AppText variant="body" color="secondary">
              {SEG_LABELS[s.key]}
              {s.customers > 0 ? ` · ${s.customers}` : ""}
            </AppText>
            <AppText variant="bodyMedium" color="primary">
              {formatCurrency(s.totalMmk)}
            </AppText>
          </View>
          <View style={styles.scoreTrack}>
            <View
              style={[styles.scoreFill, { width: `${(s.totalMmk / max) * 100}%` as `${number}%`, backgroundColor: palette[i] }]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Recommendation card ─────────────────────────────────────────────────────

export const REC_META: Record<string, { icon: IconName; color: string; label: string }> = {
  promotion: { icon: "speakerphone", color: colors.chart.dustyRose, label: my.analytics.promotion },
  stock: { icon: "package", color: colors.chart.sage, label: my.analytics.stock },
  pricing: { icon: "tag", color: colors.chart.terracotta, label: my.analytics.pricing },
  growth: { icon: "rocket", color: colors.accent.base, label: my.analytics.growth },
};

export function RecCard({ kind, rec }: { kind: string; rec: Recommendation }) {
  const meta = REC_META[kind];
  return (
    <View style={styles.card}>
      <View style={styles.recHeader}>
        <View style={[styles.recIconBox, { backgroundColor: `${meta.color}1F` }]}>
          <Icon name={meta.icon} size={16} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Eyebrow>{meta.label}</Eyebrow>
          <AppText variant="title" color="primary" style={{ marginTop: 2 }}>
            {rec.title}
          </AppText>
        </View>
      </View>

      <AppText variant="body" color="secondary" style={{ marginTop: spacing.md }}>
        {rec.advice}
      </AppText>

      <View style={styles.stepsBox}>
        <Eyebrow style={{ marginBottom: spacing.sm }}>{my.analytics.actionSteps}</Eyebrow>
        {rec.steps.map((s, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={[styles.stepDot, { backgroundColor: meta.color }]}>
              <AppText variant="caption" color="onDark" style={{ fontSize: 10 }}>
                {String(i + 1)}
              </AppText>
            </View>
            <AppText variant="body" color="primary" style={{ flex: 1 }}>
              {s}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Shared styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.pinnedCard,
    padding: spacing["3xl"],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  headlineCard: {
    backgroundColor: colors.bg.iconSoft,
    borderRadius: radius.pinnedCard,
    padding: spacing["3xl"],
  },
  headlineBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreCard: {
    flex: 1,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.pinnedCard,
    padding: spacing["2xl"],
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: "center",
  },
  scoreTrack: {
    height: 4,
    backgroundColor: colors.bg.elevated,
    borderRadius: 2,
    marginTop: spacing.md,
    width: "100%",
    overflow: "hidden",
  },
  scoreFill: {
    height: 4,
    borderRadius: 2,
  },
  riskCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.pinnedCard,
    padding: spacing["3xl"],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  riskHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  riskIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.iconContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 64,
    gap: 3,
    marginBottom: spacing.lg,
  },
  chartCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    backgroundColor: colors.accent.base,
    borderRadius: 2,
    minHeight: 4,
  },
  metricRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
    paddingTop: spacing.lg,
  },
  recHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  recIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.iconContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  stepsBox: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
    gap: spacing.sm,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  swotPanel: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.attentionCard,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderTopWidth: 3,
    padding: spacing.lg,
  },
  swotItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  swotDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 13,
  },
});
