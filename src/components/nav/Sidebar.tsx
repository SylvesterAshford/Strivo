"use client";

import { View, Pressable, Image, StyleSheet } from "@/rn";
import { useRouter, usePathname } from "@/rn/router";
import { AppText } from "@/components/ui/AppText";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon, type IconName } from "@/components/ui/Icon";
import { colors, spacing, radius } from "@/theme/tokens";
import { my } from "@/i18n/my";

// Nav grouped into labeled sections (like the reference sidebar): the daily
// financial work vs. the account. English mono-caps eyebrows match the app's
// existing section-label convention (RECENT, ACCOUNT).
const SECTIONS: { label: string; items: { href: string; icon: IconName; label: string }[] }[] = [
  {
    label: "WORKFLOW",
    items: [
      { href: "/", icon: "home", label: my.nav.home },
      { href: "/reports", icon: "reports", label: my.nav.reports },
      { href: "/analytics", icon: "analytics", label: my.nav.analytics },
    ],
  },
  {
    label: "MANAGE",
    items: [{ href: "/profile", icon: "profile", label: my.nav.profile }],
  },
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

      {/* Add data — primary action. White with a liquid-glass violet outline
          (not a heavy black fill), so it sits lightly in the nav and ties to
          the brand. The fill stays white per the theme rule. */}
      <Pressable
        onPress={() => router.push("/record")}
        className="btn-glass"
        style={({ pressed }) => [styles.addBtn, pressed && { transform: [{ scale: 0.99 }] }]}
      >
        <Icon name="plus" size={18} color={colors.identity.purple} />
        <AppText variant="bodyMedium" color="primary" style={{ marginLeft: spacing.sm }}>
          {my.addData.title}
        </AppText>
      </Pressable>

      {/* Nav — grouped into labeled sections. Active item is a floating glass
          pill with the violet identity accent on icon + label. */}
      <View style={{ marginTop: spacing.lg, gap: spacing.xl }}>
        {SECTIONS.map((section) => (
          <View key={section.label} style={{ gap: 2 }}>
            <Eyebrow style={{ marginBottom: spacing.sm, marginLeft: spacing.md }}>{section.label}</Eyebrow>
            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Pressable
                  key={item.href}
                  onPress={() => router.navigate(item.href)}
                  className={active ? "nav-glass" : undefined}
                  style={({ pressed }) => [styles.navItem, pressed && !active && { backgroundColor: colors.bg.elevated }]}
                >
                  <Icon name={item.icon} size={20} color={active ? colors.identity.purple : colors.text.secondary} />
                  <AppText
                    variant="bodyMedium"
                    style={{
                      marginLeft: spacing.md,
                      color: active ? colors.identity.purple : colors.text.secondary,
                      fontFamily: active ? "Inter-Medium" : undefined,
                    }}
                  >
                    {item.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        ))}
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
    color: colors.identity.purple,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
});
