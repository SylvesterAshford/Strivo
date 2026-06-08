"use client";

import { useState } from "react";
import { View, Pressable, StyleSheet } from "@/rn";
import { AppText } from "@/components/ui/AppText";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { colors, spacing, radius } from "@/theme/tokens";
import { logAdvisorAction, type AdvisorAction, type ActionKey } from "@/lib/api";
import { my } from "@/i18n/my";

const PRIORITY_COLOR = {
  high: colors.semantic.critical,
  medium: colors.semantic.caution,
  low: colors.text.tertiary,
} as const;

// The action loop UI. Each recommended action gets Done / Skip. The tap is the
// primary success signal for the whole Advisor — fire it to the backend and mark
// it locally so the owner sees it register. Failures are swallowed (the feedback
// is best-effort telemetry, not a transaction the user must complete).
export function AdvisorActions({ actions, periodMonth }: { actions: AdvisorAction[]; periodMonth: string }) {
  const [marked, setMarked] = useState<Partial<Record<ActionKey, "done" | "skip">>>({});

  if (actions.length === 0) return null;

  const mark = (key: ActionKey, status: "done" | "skip") => {
    setMarked((prev) => ({ ...prev, [key]: status }));
    void logAdvisorAction(key, status, periodMonth).catch(() => {
      // best-effort; revert nothing — the local mark stands so the UI feels responsive
    });
  };

  return (
    <View style={{ marginTop: spacing["2xl"], gap: spacing.md }}>
      <Eyebrow>{my.analytics.actionSteps}</Eyebrow>
      <View style={{ gap: spacing.md }}>
        {actions.map((a) => {
          const status = marked[a.key];
          return (
            <View key={a.key} style={[styles.card, status && { opacity: 0.6 }]}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
                <View style={[styles.dot, { backgroundColor: PRIORITY_COLOR[a.priority] }]} />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyMedium" color="primary">
                    {a.title}
                  </AppText>
                  <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                    {a.reason}
                  </AppText>
                </View>
              </View>

              {status ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.md }}>
                  <Icon name={status === "done" ? "shield-check" : "x"} size={14} color={colors.text.secondary} />
                  <AppText variant="caption" color="secondary">
                    {status === "done" ? my.common.done : my.common.discard}
                  </AppText>
                </View>
              ) : (
                <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
                  <Pressable onPress={() => mark(a.key, "done")} style={[styles.btn, styles.btnDone]}>
                    <AppText variant="caption" color="onDark">
                      {my.common.done}
                    </AppText>
                  </Pressable>
                  <Pressable onPress={() => mark(a.key, "skip")} style={[styles.btn, styles.btnSkip]}>
                    <AppText variant="caption" color="secondary">
                      {my.common.discard}
                    </AppText>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.attentionCard,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  btn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.iconContainer,
    alignItems: "center",
  },
  btnDone: {
    backgroundColor: colors.accent.base,
  },
  btnSkip: {
    backgroundColor: colors.bg.elevated,
  },
});
