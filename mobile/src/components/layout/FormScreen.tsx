import { View, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { colors, spacing } from "@/theme/tokens";

// Shared layout for auth + onboarding steps: title block at top, body in the
// middle, primary action pinned at the bottom above the keyboard.
export function FormScreen({
  title,
  subtitle,
  children,
  ctaLabel,
  onCta,
  ctaDisabled,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  ctaLabel: string;
  onCta: () => void;
  ctaDisabled?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.bg.base }}
    >
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + spacing["5xl"],
          paddingBottom: insets.bottom + spacing["3xl"],
          paddingHorizontal: spacing.sectionX,
        }}
      >
        <View style={{ gap: spacing.sm }}>
          <AppText variant="subhead">{title}</AppText>
          {subtitle ? (
            <AppText variant="body" color="secondary">
              {subtitle}
            </AppText>
          ) : null}
        </View>

        <View style={{ flex: 1, justifyContent: "center", gap: spacing.lg }}>{children}</View>

        <Button label={ctaLabel} onPress={onCta} disabled={ctaDisabled} style={ctaDisabled ? { opacity: 0.5 } : undefined} />
      </View>
    </KeyboardAvoidingView>
  );
}
