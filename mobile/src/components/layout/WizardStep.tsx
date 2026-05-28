import { View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { colors, spacing, radius } from "@/theme/tokens";

// Wizard layout: progress bar at top, title block, body, primary CTA pinned
// at the bottom above the keyboard. Used by every onboarding wizard step so
// the progress feels consistent.
export function WizardStep({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  ctaLabel,
  onCta,
  ctaDisabled,
  secondaryLabel,
  onSecondary,
}: {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  ctaLabel: string;
  onCta: () => void;
  ctaDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const pct = (step / totalSteps) * 100;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.bg.base }}
    >
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + spacing["3xl"],
          paddingBottom: insets.bottom + spacing["3xl"],
          paddingHorizontal: spacing.sectionX,
        }}
      >
        <View style={{ gap: spacing.sm, marginBottom: spacing["3xl"] }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <AppText variant="caption" color="tertiary">
              {`STEP ${step} / ${totalSteps}`}
            </AppText>
            <AppText variant="caption" color="tertiary">
              {`${Math.round(pct)}%`}
            </AppText>
          </View>
          <View
            style={{
              height: 4,
              backgroundColor: colors.bg.track,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${pct}%`,
                height: "100%",
                backgroundColor: colors.accent.base,
                borderRadius: 2,
              }}
            />
          </View>
        </View>

        <View style={{ gap: spacing.sm, marginBottom: spacing["2xl"] }}>
          <AppText variant="subhead">{title}</AppText>
          {subtitle ? (
            <AppText variant="body" color="secondary">
              {subtitle}
            </AppText>
          ) : null}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.lg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>

        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <Button label={ctaLabel} onPress={onCta} disabled={ctaDisabled} style={ctaDisabled ? { opacity: 0.5 } : undefined} />
          {secondaryLabel && onSecondary ? (
            <Button label={secondaryLabel} variant="secondary" onPress={onSecondary} />
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
