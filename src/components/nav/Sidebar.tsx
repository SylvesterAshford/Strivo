"use client";

import { View, Pressable, Image, StyleSheet } from "@/rn";
import { useRouter, usePathname } from "@/rn/router";
import { AppText } from "@/components/ui/AppText";
import { Icon, type IconName } from "@/components/ui/Icon";
import { colors, spacing, radius } from "@/theme/tokens";
import { my } from "@/i18n/my";

const NAV: { href: string; icon: IconName; label: string }[] = [
  { href: "/", icon: "home", label: my.nav.home },
  { href: "/reports", icon: "reports", label: my.nav.reports },
  { href: "/analytics", icon: "analytics", label: my.nav.analytics },
  { href: "/profile", icon: "profile", label: my.nav.profile },
];

// Desktop-only left navigation (hidden under 1024px via the .app-sidebar class).
export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <View style={styles.root}>
      {/* Brand */}
      <View style={styles.brand}>
        <Image source="/strivo-logo.png" style={{ width: 28, height: 28 }} resizeMode="contain" accessibilityLabel="Strivo" />
        <AppText style={styles.wordmark}>Strivo</AppText>
      </View>

      {/* Add data — primary action */}
      <Pressable onPress={() => router.push("/record")} style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.9 }]}>
        <Icon name="plus" size={18} color={colors.text.onDark} />
        <AppText variant="bodyMedium" color="onDark" style={{ marginLeft: spacing.sm }}>
          {my.addData.title}
        </AppText>
      </Pressable>

      {/* Nav */}
      <View style={{ gap: 2, marginTop: spacing.lg }}>
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Pressable
              key={item.href}
              onPress={() => router.navigate(item.href)}
              style={({ pressed }) => [styles.navItem, active && styles.navItemActive, pressed && !active && { backgroundColor: colors.bg.elevated }]}
            >
              <Icon name={item.icon} size={20} color={active ? colors.accent.base : colors.text.secondary} />
              <AppText variant="bodyMedium" style={{ marginLeft: spacing.md, color: active ? colors.text.primary : colors.text.secondary }}>
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingVertical: spacing["3xl"],
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  wordmark: {
    fontFamily: "Inter-Medium",
    fontSize: 19,
    letterSpacing: 0.2,
    color: colors.text.primary,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent.base,
    borderRadius: radius.attentionCard,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.attentionCard,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  navItemActive: {
    backgroundColor: colors.accent.soft,
  },
});
