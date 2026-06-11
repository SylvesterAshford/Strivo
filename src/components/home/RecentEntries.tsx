"use client";

import { View, Pressable, StyleSheet, Swipeable } from "@/rn";
import { useQueryClient } from "@tanstack/react-query";
import { AppText } from "@/components/ui/AppText";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { colors, spacing, radius } from "@/theme/tokens";
import { formatCurrency } from "@/lib/format";
import { deleteFact, type RecentEntry } from "@/lib/api";

// Maps a fact kind to an icon + accent colour pair.
const KIND_META: Record<
  RecentEntry["kind"],
  { icon: "trending-up" | "trending-down" | "clock" | "square"; color: string; bg: string }
> = {
  sale: { icon: "trending-up", color: colors.semantic.positive, bg: "rgba(92,123,107,0.12)" },
  expense: { icon: "trending-down", color: colors.semantic.caution, bg: "rgba(201,119,85,0.12)" },
  receivable: { icon: "clock", color: colors.accent.base, bg: colors.accent.soft },
  note: { icon: "square", color: colors.text.secondary, bg: colors.bg.iconNeutral },
};

function DeleteAction({ onDelete }: { onDelete: () => void }) {
  // Calm trailing control, not a red wall. Muted ✕; the row's hover tint
  // (.entry-delete:hover in globals.css) signals it deletes. A confirm guards
  // accidental taps since web has no swipe-to-undo gesture.
  return (
    <Pressable onPress={onDelete} style={styles.deleteAction} className="entry-delete" accessibilityLabel="ဖျက်ရန်">
      <Icon name="x" size={15} color={colors.text.tertiary} />
    </Pressable>
  );
}

function EntryRow({ entry, onDeleted }: { entry: RecentEntry; onDeleted: () => void }) {
  const meta = KIND_META[entry.kind];

  const handleDelete = async () => {
    if (typeof window !== "undefined" && !window.confirm("ဤမှတ်တမ်းကို ဖျက်မလား?")) return;
    await deleteFact(entry.id);
    onDeleted();
  };

  return (
    <Swipeable renderRightActions={() => <DeleteAction onDelete={() => void handleDelete()} />}>
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
          <Icon name={meta.icon} size={16} color={meta.color} />
        </View>
        <AppText variant="body" color="primary" style={styles.desc} numberOfLines={1}>
          {entry.description}
        </AppText>
        {entry.amountMmk != null ? (
          <AppText variant="bodyMedium" color="primary" style={styles.amount}>
            {formatCurrency(entry.amountMmk)}
          </AppText>
        ) : null}
      </View>
    </Swipeable>
  );
}

export function RecentEntries({ entries, label = "TODAY" }: { entries: RecentEntry[]; label?: string }) {
  const queryClient = useQueryClient();

  if (!entries.length) return null;

  const handleDeleted = () => {
    void queryClient.invalidateQueries({ queryKey: ["home"] });
    void queryClient.invalidateQueries({ queryKey: ["reports"] });
    void queryClient.invalidateQueries({ queryKey: ["analytics"] });
  };

  return (
    <View style={styles.container}>
      <Eyebrow style={{ marginBottom: spacing.sm }}>{label}</Eyebrow>
      <View style={styles.list}>
        {entries.map((e, i) => (
          <View key={e.id}>
            <EntryRow entry={e} onDeleted={handleDeleted} />
            {i < entries.length - 1 ? <View style={styles.divider} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
  },
  list: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.attentionCard,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    backgroundColor: colors.bg.surface,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: radius.iconContainer,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  desc: {
    flex: 1,
  },
  amount: {
    flexShrink: 0,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.hairline,
    marginLeft: spacing.lg + 28 + spacing.md,
  },
  // Calm, narrow tap target — no fill. The hover tint lives in globals.css.
  deleteAction: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
