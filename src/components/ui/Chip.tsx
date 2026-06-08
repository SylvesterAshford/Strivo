"use client";

import { Pressable, StyleSheet } from "@/rn";
import { AppText } from "./AppText";
import { colors, spacing, radius } from "@/theme/tokens";

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected ? styles.selected : styles.unselected]}>
      <AppText variant="bodyMedium" style={{ color: selected ? colors.accent.base : colors.text.primary }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.attentionCard,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  selected: {
    backgroundColor: colors.accent.soft,
    borderColor: colors.accent.base,
  },
  unselected: {
    backgroundColor: colors.bg.surface,
    borderColor: colors.border.default,
  },
});
