"use client";

import { View, Pressable, BlurView, LinearGradient, StyleSheet } from "@/rn";
import { useRouter, usePathname } from "@/rn/router";
import { DockButton } from "./DockButton";
import { Icon } from "@/components/ui/Icon";
import { colors, radius, spacing } from "@/theme/tokens";

const TABS = [
  { href: "/", icon: "home" },
  { href: "/reports", icon: "reports" },
  { href: "/analytics", icon: "analytics" },
  { href: "/profile", icon: "profile" },
] as const;

const MID = 2; // add-data button splices between tab index 1 and 2

export function FloatingDock() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <BlurView intensity={24} tint="light" style={styles.dock}>
        {TABS.slice(0, MID).map((tab) => (
          <DockButton key={tab.href} icon={tab.icon} isFocused={pathname === tab.href} onPress={() => router.navigate(tab.href)} />
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add data"
          onPress={() => router.push("/record")}
          style={({ pressed }) => [styles.micWrap, { transform: [{ scale: pressed ? 0.94 : 1 }], opacity: pathname === "/record" ? 0.35 : 1 }]}
        >
          <LinearGradient colors={colors.gradient.brand} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.mic}>
            <Icon name="plus" size={26} color={colors.text.onDark} />
          </LinearGradient>
        </Pressable>

        {TABS.slice(MID).map((tab) => (
          <DockButton key={tab.href} icon={tab.icon} isFocused={pathname === tab.href} onPress={() => router.navigate(tab.href)} />
        ))}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Fixed to the viewport but constrained to the centered app column width.
  wrap: {
    position: "fixed",
    bottom: spacing.xl,
    left: 0,
    right: 0,
    marginInline: "auto",
    maxWidth: "calc(min(480px, 100vw) - 36px)",
    width: "calc(min(480px, 100vw) - 36px)",
    zIndex: 50,
  },
  dock: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.dock,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: "rgba(255,255,255,0.6)",
    boxShadow: "0 8px 24px rgba(124,58,237,0.12)",
  },
  micWrap: { paddingHorizontal: spacing.md },
  mic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: `0 4px 16px ${colors.accent.glow}`,
  },
});
