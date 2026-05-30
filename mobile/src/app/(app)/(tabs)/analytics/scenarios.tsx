import { useState } from "react";
import { View, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/layout/Screen";
import { SubHeader } from "@/components/layout/SubHeader";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { TextField } from "@/components/ui/TextField";
import { Icon, type IconName } from "@/components/ui/Icon";
import { runInsightScenario, type ScenarioResult } from "@/lib/api";
import { colors, spacing, radius } from "@/theme/tokens";
import { my } from "@/i18n/my";

type Mode = "input" | "loading" | "result" | "empty";

type ErrorKind = "overloaded" | "other";
interface ErrorState {
  kind: ErrorKind;
  message: string;
  // The scenario string that failed — used by the Retry button.
  retry: string;
}

interface TemplateCard {
  key: string;
  label: string;
  icon: IconName;
  color: string;
}

const TEMPLATES: TemplateCard[] = [
  { key: "lowerPrice", label: my.scenarios.templates.lowerPrice, icon: "trending-down", color: colors.semantic.caution },
  { key: "raisePrice", label: my.scenarios.templates.raisePrice, icon: "trending-up", color: colors.semantic.positive },
  { key: "promotion", label: my.scenarios.templates.promotion, icon: "speakerphone", color: colors.chart.dustyRose },
  { key: "cutExpense", label: my.scenarios.templates.cutExpense, icon: "tag", color: colors.chart.terracotta },
  { key: "hireStaff", label: my.scenarios.templates.hireStaff, icon: "profile", color: colors.accent.base },
  { key: "addProduct", label: my.scenarios.templates.addProduct, icon: "package", color: colors.chart.sage },
  { key: "openLocation", label: my.scenarios.templates.openLocation, icon: "rocket", color: colors.accent.base },
];

function classifyError(message: string): ErrorKind {
  return /overload|rate.?limit|503|UNAVAILABLE|high demand/i.test(message) ? "overloaded" : "other";
}

export default function ScenariosScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("input");
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);

  const run = async (scenario: string) => {
    const trimmed = scenario.trim();
    if (trimmed.length < 5) return;
    setError(null);
    setMode("loading");
    try {
      const res = await runInsightScenario(trimmed);
      if (res.ready === false) {
        setMode("empty");
        return;
      }
      setResult(res.result);
      setMode("result");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Scenario failed";
      setError({ kind: classifyError(message), message, retry: trimmed });
      setMode("input");
    }
  };

  const reset = () => {
    setText("");
    setResult(null);
    setError(null);
    setMode("input");
  };

  // ── Empty (no cached insights) ─────────────────────────────────────────
  if (mode === "empty") {
    return (
      <Screen>
        <SubHeader title={my.scenarios.title} />
        <View style={styles.centerBox}>
          <View style={styles.softIconBox}>
            <Icon name="sparkles" size={28} color={colors.accent.base} />
          </View>
          <AppText variant="serifLg" color="primary" style={{ textAlign: "center" }}>
            {my.scenarios.emptyHeadline}
          </AppText>
          <AppText variant="body" color="secondary" style={{ textAlign: "center" }}>
            {my.scenarios.emptyBody}
          </AppText>
          <Button label={my.scenarios.emptyCta} onPress={() => router.replace("/analytics")} />
        </View>
      </Screen>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────
  if (mode === "loading") {
    return (
      <Screen scroll={false}>
        <SubHeader title={my.scenarios.title} />
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.accent.base} size="large" />
          <AppText variant="body" color="secondary" style={{ marginTop: spacing.lg, textAlign: "center" }}>
            {my.analytics.analyzing}
          </AppText>
        </View>
      </Screen>
    );
  }

  // ── Result ─────────────────────────────────────────────────────────────
  if (mode === "result" && result) {
    const sales = result.estimatedImpact.salesPct;
    const margin = result.estimatedImpact.marginPct;
    const salesColor = sales >= 0 ? colors.semantic.positive : colors.semantic.critical;
    const marginColor = margin >= 0 ? colors.semantic.positive : colors.semantic.critical;
    const riskColor =
      result.estimatedImpact.risk === "high"
        ? colors.semantic.critical
        : result.estimatedImpact.risk === "medium"
        ? colors.semantic.caution
        : colors.semantic.positive;
    const riskLabel =
      result.estimatedImpact.risk === "high"
        ? my.analytics.riskHigh
        : result.estimatedImpact.risk === "medium"
        ? my.analytics.riskMedium
        : my.analytics.riskLow;

    return (
      <Screen>
        <SubHeader title={my.scenarios.title} />

        <View style={{ gap: spacing.lg }}>
          <View style={styles.headlineCard}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}>
              <Icon name="sparkles" size={14} color={colors.accent.base} />
              <Eyebrow style={{ marginLeft: 6 }}>SCENARIO</Eyebrow>
            </View>
            <AppText variant="serifLg" color="primary" style={{ lineHeight: 46 }}>
              {result.headline}
            </AppText>
          </View>

          <View style={styles.impactRow}>
            <ImpactTile label={my.scenarios.impactSales} value={formatPct(sales)} color={salesColor} />
            <ImpactTile label={my.scenarios.impactMargin} value={formatPct(margin)} color={marginColor} />
            <ImpactTile label={my.scenarios.impactRisk} value={riskLabel} color={riskColor} />
          </View>

          {result.watchFor.length > 0 ? (
            <View style={styles.card}>
              <Eyebrow style={{ marginBottom: spacing.md }}>{my.scenarios.watchFor}</Eyebrow>
              {result.watchFor.map((item, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={[styles.bulletDot, { backgroundColor: colors.semantic.caution }]} />
                  <AppText variant="body" color="primary" style={{ flex: 1 }}>
                    {item}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.card}>
            <Eyebrow style={{ marginBottom: spacing.md }}>{my.scenarios.steps}</Eyebrow>
            {result.steps.map((s, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={[styles.stepDot, { backgroundColor: colors.accent.base }]}>
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

          {result.caveats.length > 0 ? (
            <View style={[styles.card, { borderTopWidth: 3, borderTopColor: colors.semantic.caution }]}>
              <Eyebrow style={{ marginBottom: spacing.md }}>{my.scenarios.caveats}</Eyebrow>
              {result.caveats.map((c, i) => (
                <AppText key={i} variant="body" color="secondary" style={{ marginBottom: spacing.xs }}>
                  {c}
                </AppText>
              ))}
            </View>
          ) : null}

          <Button label={my.scenarios.resetCta} variant="secondary" onPress={reset} />
        </View>
      </Screen>
    );
  }

  // ── Input (initial / error) ────────────────────────────────────────────
  return (
    <Screen>
      <SubHeader title={my.scenarios.title} />
      <AppText variant="body" color="secondary" style={{ marginBottom: spacing.lg }}>
        {my.scenarios.subtitle}
      </AppText>

      <Eyebrow style={{ marginBottom: spacing.md }}>{my.scenarios.commonLabel}</Eyebrow>
      <View style={{ gap: spacing.sm }}>
        {TEMPLATES.map((t) => (
          <TemplateRow key={t.key} item={t} onPress={() => run(t.label)} />
        ))}
      </View>

      <View style={styles.divider} />

      <Eyebrow style={{ marginBottom: spacing.md }}>{my.scenarios.customLabel}</Eyebrow>
      <TextField
        value={text}
        onChangeText={setText}
        placeholder={my.scenarios.customPlaceholder}
        multiline
        numberOfLines={3}
        style={{ minHeight: 80, textAlignVertical: "top" }}
        autoCapitalize="none"
      />

      {error ? (
        <ErrorBanner error={error} onRetry={() => run(error.retry)} />
      ) : null}

      <View style={{ marginTop: spacing.lg }}>
        <Button
          label={my.scenarios.runCta}
          onPress={() => run(text)}
          disabled={text.trim().length < 5}
        />
      </View>
    </Screen>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function TemplateRow({ item, onPress }: { item: TemplateCard; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${item.color}1F` }]}>
        <Icon name={item.icon} size={18} color={item.color} />
      </View>
      <AppText variant="bodyMedium" style={{ flex: 1, marginHorizontal: spacing.md }}>
        {item.label}
      </AppText>
      <Icon name="chevron-right" size={18} color={colors.text.tertiary} />
    </Pressable>
  );
}

function ErrorBanner({ error, onRetry }: { error: ErrorState; onRetry: () => void }) {
  if (error.kind === "overloaded") {
    return (
      <View style={styles.errorBanner}>
        <View style={{ flex: 1, marginRight: spacing.md }}>
          <AppText variant="bodyMedium" style={{ color: colors.semantic.caution }}>
            {my.scenarios.overloadedHeadline}
          </AppText>
          <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
            {my.scenarios.overloadedBody}
          </AppText>
        </View>
        <Pressable onPress={onRetry} style={styles.retryBtn} hitSlop={8}>
          <AppText variant="caption" color="accent">
            {my.scenarios.retryCta}
          </AppText>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={styles.errorBanner}>
      <AppText variant="caption" style={{ color: colors.semantic.critical, flex: 1 }}>
        {error.message}
      </AppText>
    </View>
  );
}

function ImpactTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.impactTile}>
      <AppText variant="caption" color="secondary" style={{ textAlign: "center" }}>
        {label}
      </AppText>
      <AppText
        variant="title"
        style={{ color, textAlign: "center", marginTop: spacing.sm, flexShrink: 1 }}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {value}
      </AppText>
    </View>
  );
}

function formatPct(n: number): string {
  if (n > 0) return `+${n}%`;
  return `${n}%`;
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing["3xl"],
    paddingTop: spacing["4xl"],
  },
  softIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bg.iconSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.surface,
    borderRadius: radius.attentionCard,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.iconContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.default,
    marginVertical: spacing["2xl"],
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.iconSoft,
    borderRadius: radius.attentionCard,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  retryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.iconContainer,
    backgroundColor: colors.accent.soft,
  },
  headlineCard: {
    backgroundColor: colors.bg.iconSoft,
    borderRadius: radius.pinnedCard,
    padding: spacing["3xl"],
  },
  impactRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  impactTile: {
    flex: 1,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.attentionCard,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: "center",
    minHeight: 80,
    justifyContent: "center",
    gap: spacing.xs,
  },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.pinnedCard,
    padding: spacing["2xl"],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 13,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
});
