"use client";

import { View, Pressable, StyleSheet, ScrollView, useSafeAreaInsets } from "@/rn";
import { useRouter } from "@/rn/router";
import { AppText } from "@/components/ui/AppText";
import { Icon, type IconName } from "@/components/ui/Icon";
import { colors, spacing, radius } from "@/theme/tokens";
import { my } from "@/i18n/my";

// The center dock action: a hub for getting data into the app. Routes to the
// bulk import flows and manual entry.
interface Option {
  icon: IconName;
  title: string;
  subtitle: string;
  route: "/import-sales" | "/import-expenses" | "/import-products" | "/manual-entry";
  tint: string;
}

const IMPORTS: Option[] = [
  { icon: "spreadsheet", title: my.addData.salesTitle, subtitle: my.addData.salesSubtitle, route: "/import-sales", tint: colors.chart.plum },
  { icon: "tag", title: my.addData.expensesTitle, subtitle: my.addData.expensesSubtitle, route: "/import-expenses", tint: colors.chart.terracotta },
  { icon: "package", title: my.addData.productsTitle, subtitle: my.addData.productsSubtitle, route: "/import-products", tint: colors.chart.dustyBlue },
];

export default function AddDataScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <AppText variant="subhead">{my.addData.title}</AppText>
        <Pressable onPress={() => router.back()}>
          <Icon name="x" size={22} color={colors.text.primary} />
        </Pressable>
      </View>

      <ScrollView
        style={{ width: "100%", maxWidth: 760 }}
        contentContainerStyle={{ paddingHorizontal: spacing.sectionX, paddingBottom: insets.bottom + spacing["4xl"] }}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="body" color="secondary" style={{ marginBottom: spacing["2xl"] }}>
          {my.addData.subtitle}
        </AppText>

        <View style={{ gap: spacing.lg }}>
          {IMPORTS.map((opt) => (
            <Card key={opt.route} opt={opt} onPress={() => router.push(opt.route)} />
          ))}
        </View>

        <View style={styles.divider} />

        <Card
          opt={{ icon: "pencil", title: my.addData.manualTitle, subtitle: my.addData.manualSubtitle, route: "/manual-entry", tint: colors.accent.base }}
          onPress={() => router.push("/manual-entry")}
        />
      </ScrollView>
    </View>
  );
}

function Card({ opt, onPress }: { opt: Option; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.7, transform: [{ scale: 0.99 }] }]}>
      <View style={[styles.iconBox, { backgroundColor: opt.tint + "1F" }]}>
        <Icon name={opt.icon} size={22} color={opt.tint} />
      </View>
      <View style={{ flex: 1, marginHorizontal: spacing.lg }}>
        <AppText variant="title">{opt.title}</AppText>
        <AppText variant="caption" color="secondary" style={{ marginTop: 2 }}>
          {opt.subtitle}
        </AppText>
      </View>
      <Icon name="chevron-right" size={18} color={colors.text.tertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: "100dvh",
    backgroundColor: colors.bg.base,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 760,
    paddingHorizontal: spacing.sectionX,
    paddingBottom: spacing.xl,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.surface,
    borderRadius: radius.pinnedCard,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.xl,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.iconContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.default,
    marginVertical: spacing["2xl"],
  },
});
