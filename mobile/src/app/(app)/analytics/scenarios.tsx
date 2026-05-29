import { useState } from "react";
import { View, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/layout/Screen";
import { SubHeader } from "@/components/layout/SubHeader";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { TextField } from "@/components/ui/TextField";
import { Icon } from "@/components/ui/Icon";
import { runInsightScenario, type ScenarioResult } from "@/lib/api";
import { colors, spacing, radius } from "@/theme/tokens";
import { my } from "@/i18n/my";

type Mode = "input" | "loading" | "result" | "empty";

const TEMPLATES = [
  my.scenarios.templates.lowerPrice,
  my.scenarios.templates.raisePrice,
  my.scenarios.templates.promotion,
  my.scenarios.templates.cutExpense,
  my.scenarios.templates.hireStaff,
  my.scenarios.templates.addProduct,
  my.scenarios.templates.openLocation,
];

export default function ScenariosScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("input");
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setError(e instanceof Error ? e.message : "Scenario failed");
      setMode("input");
    }
  };

  const reset = () => {
    setText("");
    setResult(null);
    setError(null);
    setMode("input");
  };

  // ── Empty (no cached insights yet) ────────────────────────────────────
  if (mode === "empty") {
    return (
      <Screen>
        <SubHeader title={my.scenarios.title} />
        <View style={styles.emptyBox}>
          <View style={styles.iconBox}>
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

  // ── Loading ───────────────────────────────────────────────────────────
  if (mode === "loading") {
    return (
      <Screen scroll={false}>
        <SubHeader title={my.scenarios.title} />
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.accent.base} size="large" />
          <AppText variant="body" color="secondary" style={{ marginTop: spacing.lg, textAlign: "center" }}>
            {my.analytics.analyzing}
          </AppText>
        </View>
      </Screen>
    );
  }

  // ── Result ────────────────────────────────────────────────────────────
  if (mode === "result" && result) {
    const salesColor = result.estimatedImpact.salesPct >= 0 ? colors.semantic.positive : colors.semantic.critical;
    const marginColor = result.estimatedImpact.marginPct >= 0 ? colors.semantic.positive : colors.semantic.critical;
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
            <ImpactTile label={my.scenarios.impactSales} value={`${formatPct(result.estimatedImpact.salesPct)}`} color={salesColor} />
            <ImpactTile label={my.scenarios.impactMargin} value={`${formatPct(result.estimatedImpact.marginPct)}`} color={marginColor} />
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
              <Eyebrow style={{ marginBottom: spacing.md, color: colors.semantic.caution }}>
                {my.scenarios.caveats}
              </Eyebrow>
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

  // ── Input (initial) ───────────────────────────────────────────────────
  return (
    <Screen>
      <SubHeader title={my.scenarios.title} />
      <AppText variant="body" color="secondary" style={{ marginBottom: spacing.lg }}>
        {my.scenarios.subtitle}
      </AppText>

      <View style={{ gap: spacing.md }}>
        <Eyebrow>{my.scenarios.templatesLabel}</Eyebrow>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {TEMPLATES.map((t) => (
            <Chip
              key={t}
              label={t}
              selected={text === t}
              onPress={() => {
                setText(t);
                void run(t);
              }}
            />
          ))}
        </View>

        <Eyebrow style={{ marginTop: spacing.lg }}>{my.scenarios.customLabel}</Eyebrow>
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
          <AppText variant="caption" style={{ color: colors.semantic.critical }}>
            {error}
          </AppText>
        ) : null}

        <Button
          label={my.scenarios.runCta}
          onPress={() => run(text)}
          disabled={text.trim().length < 5}
        />
      </View>
    </Screen>
  );
}

function ImpactTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.impactTile}>
      <AppText variant="caption" color="secondary" style={{ textAlign: "center" }}>
        {label}
      </AppText>
      <AppText variant="serifLg" style={{ color, textAlign: "center", marginTop: spacing.xs }}>
        {value}
      </AppText>
    </View>
  );
}

function formatPct(n: number): string {
  if (n > 0) return `+${n}%`;
  return `${n}%`;
}

const styles = StyleSheet.create({
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing["3xl"],
    paddingTop: spacing["4xl"],
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["3xl"],
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bg.iconSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headlineCard: {
    backgroundColor: colors.bg.iconSoft,
    borderRadius: radius.pinnedCard,
    padding: spacing["3xl"],
  },
  impactRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  impactTile: {
    flex: 1,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.pinnedCard,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: "center",
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
