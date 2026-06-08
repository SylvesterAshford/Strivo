"use client";

import { View, StyleSheet, Pressable } from "@/rn";
import { AppText } from "@/components/ui/AppText";
import { Icon, type IconName } from "@/components/ui/Icon";
import { colors, spacing, radius } from "@/theme/tokens";

interface Props {
  icon: IconName;
  iconColor: string;
  title: string;
  preview: string;
  onPress: () => void;
}

export function SectionNavCard({ icon, iconColor, title, preview, onPress }: Props) {
  return (
    <Pressable className="lift" onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}>
      <View style={[styles.iconBox, { backgroundColor: `${iconColor}1F` }]}>
        <Icon name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <AppText variant="bodyMedium" color="primary">
          {title}
        </AppText>
        <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
          {preview}
        </AppText>
      </View>
      <Icon name="chevron-right" size={18} color={colors.text.tertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.surface,
    borderRadius: radius.pinnedCard,
    paddingVertical: spacing["2xl"],
    paddingHorizontal: spacing["2xl"],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.iconContainer,
    alignItems: "center",
    justifyContent: "center",
  },
});
