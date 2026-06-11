"use client";

import { View, Pressable, StyleSheet } from "@/rn";
import { useRouter } from "@/rn/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/layout/Screen";
import { QueryError } from "@/components/layout/QueryError";
import { Skeleton } from "@/components/layout/Skeleton";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { colors, spacing, radius } from "@/theme/tokens";
import { my } from "@/i18n/my";
import { fetchImports, deleteImportBatch, type ImportBatch } from "@/lib/api";

// Import history — one row per upload event. Deleting a row is the undo for
// that import: the batch's facts cascade-delete and every number rolls back.

function formatBatchDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function BatchRow({ batch, onDeleted }: { batch: ImportBatch; onDeleted: () => void }) {
  const title = batch.fileName ?? my.imports.sourceLabels[batch.source] ?? batch.source;

  const handleDelete = async () => {
    if (typeof window !== "undefined" && !window.confirm(`${my.imports.deleteTitle}\n${my.imports.deleteBody}`)) return;
    await deleteImportBatch(batch.id);
    onDeleted();
  };

  const detail = [
    my.imports.sourceLabels[batch.source] ?? batch.source,
    formatBatchDate(batch.createdAt),
    my.imports.inserted(batch.insertedCount),
    ...(batch.skippedCount > 0 ? [my.imports.skipped(batch.skippedCount)] : []),
  ].join(" · ");

  return (
    <View style={styles.row}>
      <View style={styles.iconBox}>
        <Icon name="spreadsheet" size={16} color={colors.text.secondary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="bodyMedium" color="primary" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" color="tertiary" numberOfLines={1}>
          {detail}
        </AppText>
      </View>
      <Pressable
        onPress={() => void handleDelete()}
        className="entry-delete"
        style={styles.deleteAction}
        accessibilityLabel={my.imports.deleteCta}
      >
        <Icon name="x" size={15} color={colors.text.tertiary} />
      </Pressable>
    </View>
  );
}

export default function ImportsScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["imports"],
    queryFn: fetchImports,
    staleTime: 30_000,
  });

  const handleDeleted = () => {
    void qc.invalidateQueries({ queryKey: ["imports"] });
    void qc.invalidateQueries({ queryKey: ["home"] });
    void qc.invalidateQueries({ queryKey: ["reports"] });
    void qc.invalidateQueries({ queryKey: ["insights"] });
  };

  const header = (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} accessibilityLabel="Back" style={{ padding: spacing.xs }}>
        <Icon name="arrow-left" size={20} color={colors.text.primary} />
      </Pressable>
      <AppText variant="subhead">{my.imports.title}</AppText>
    </View>
  );

  return (
    <Screen contentStyle={{ maxWidth: 640 }}>
      {header}
      {isError && !data ? (
        <QueryError onRetry={() => void refetch()} />
      ) : isLoading && !data ? (
        <View style={{ gap: spacing.md }}>
          <Skeleton height={64} style={{ borderRadius: 12 }} />
          <Skeleton height={64} style={{ borderRadius: 12 }} />
        </View>
      ) : !data || data.batches.length === 0 ? (
        <View style={styles.emptyCard}>
          <AppText variant="body" color="secondary" style={{ textAlign: "center" }}>
            {my.imports.empty}
          </AppText>
        </View>
      ) : (
        <View style={styles.list}>
          {data.batches.map((b, i) => (
            <View key={b.id}>
              <BatchRow batch={b} onDeleted={handleDeleted} />
              {i < data.batches.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing["2xl"],
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
    paddingVertical: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.bg.surface,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: radius.iconContainer,
    backgroundColor: colors.bg.iconNeutral,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.hairline,
    marginLeft: spacing.lg + 28 + spacing.md,
  },
  deleteAction: {
    width: 40,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emptyCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.attentionCard,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing["3xl"],
  },
});
