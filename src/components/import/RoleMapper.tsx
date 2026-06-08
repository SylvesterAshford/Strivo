"use client";

import { View, Pressable, ScrollView, StyleSheet } from "@/rn";
import { AppText } from "@/components/ui/AppText";
import { colors, spacing, radius } from "@/theme/tokens";

// Column-mapping control shared by the sales, expenses, and bulk-import flows.
// A labelled row of horizontally-scrolling chips; the user taps a spreadsheet
// column header (or "none") to map it to a role (date, amount, customer, …).
//
// Previously this was copy-pasted into three screens, where the chip styles had
// already drifted; one source of truth now.

export function RoleRow({
  label,
  headers,
  selectedIdx,
  onPick,
  noneLabel,
}: {
  label: string;
  headers: string[];
  selectedIdx: number;
  onPick: (idx: number) => void;
  noneLabel: string;
}) {
  return (
    <View>
      <AppText variant="bodyMedium" style={{ marginBottom: spacing.sm }}>
        {label}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        <RoleChip label={noneLabel} selected={selectedIdx === -1} onPress={() => onPick(-1)} />
        {headers.map((h, i) => (
          <RoleChip key={i} label={h || `Col ${i + 1}`} selected={selectedIdx === i} onPress={() => onPick(i)} />
        ))}
      </ScrollView>
    </View>
  );
}

export function RoleChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected ? { backgroundColor: colors.accent.soft, borderColor: colors.accent.base } : null]}>
      <AppText variant="caption" style={{ color: selected ? colors.accent.base : colors.text.primary }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.iconContainer,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
    flexShrink: 0,
  },
});
