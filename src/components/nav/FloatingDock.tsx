"use client";

import { View, Pressable, BlurView, StyleSheet } from "@/rn";
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
      <BlurView intensity={42} tint="light" style={styles.dock}>
        {TABS.slice(0, MID).map((tab) => (
          <DockButton key={tab.href} icon={tab.icon} isFocused={pathname === tab.href} onPress={() => router.navigate(tab.href)} />
        ))}

        {/* Add data — same liquid-glass violet treatment as the desktop
            sidebar button: white glass fill, violet outline + icon, soft
            violet glow. Ties the primary action to the brand identity
            instead of a heavy dark fill. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add data"
          onPress={() => router.push("/record")}
          style={({ pressed }) => [styles.micWrap, { transform: [{ scale: pressed ? 0.94 : 1 }], opacity: pathname === "/record" ? 0.35 : 1 }]}
        >
          <View style={styles.mic}>
            <Icon name="plus" size={26} color={colors.identity.purple} />
          </View>
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
    borderColor: "rgba(255,255,255,0.6)",
    backgroundColor: "rgba(255,255,255,0.5)",
    // Apple liquid-glass: bright inset top highlight + soft violet ambient shadow.
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85), 0 8px 28px rgba(124,58,237,0.16)",
  },
  micWrap: { paddingHorizontal: spacing.md },
  mic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.identity.border,
    backgroundColor: "rgba(255,255,255,0.85)",
    // Liquid glass: bright inset top highlight + soft violet ambient glow.
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95), 0 4px 16px rgba(124,58,237,0.22)",
  },
});
