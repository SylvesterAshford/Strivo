import { View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { colors, spacing, radius } from "@/theme/tokens";

// design.md 6.3 — educational empty state: serif Burmese headline, English-mono
// subline explaining what unlocks the screen, optional CTA.
export function EmptyState({
  icon,
  headline,
  subline,
  ctaLabel,
  onCta,
}: {
  icon: IconName;
  headline: string;
  subline: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg, paddingTop: spacing["5xl"] }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: radius.goalCard,
          backgroundColor: colors.bg.iconSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={32} color={colors.accent.base} />
      </View>
      <AppText variant="subhead" style={{ textAlign: "center" }}>
        {headline}
      </AppText>
      <Eyebrow style={{ textAlign: "center", maxWidth: 260 }}>{subline}</Eyebrow>
      {ctaLabel && onCta ? (
        <View style={{ marginTop: spacing.md, alignSelf: "stretch", paddingHorizontal: spacing["5xl"] }}>
          <Button label={ctaLabel} onPress={onCta} />
        </View>
      ) : null}
    </View>
  );
}
