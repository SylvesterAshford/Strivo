"use client";

import { View } from "@/rn";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { colors, spacing, radius } from "@/theme/tokens";

// Shown when a data query fails (vs. a genuinely empty account). Gives the user
// a clear "this didn't load" signal and a retry, instead of silently rendering
// the cold-start/empty state on a network or server error.
export function QueryError({ onRetry }: { onRetry?: () => void }) {
  return (
    <View
      style={{
        alignItems: "center",
        gap: spacing.lg,
        padding: spacing["3xl"],
        marginTop: spacing.lg,
        backgroundColor: colors.bg.surface,
        borderRadius: radius.pinnedCard,
        borderWidth: 1,
        borderColor: colors.border.default,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: radius.iconContainer,
          backgroundColor: colors.bg.iconSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="alert-triangle" size={22} color={colors.semantic.caution} />
      </View>
      <AppText variant="bodyMedium" color="primary" style={{ textAlign: "center" }}>
        ဒေတာ ဆွဲယူ၍ မရပါ
      </AppText>
      {onRetry ? (
        <View style={{ alignSelf: "stretch" }}>
          <Button label="ထပ်ကြိုးစားမည်" variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}
