import { View, Pressable, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DockButton } from "./DockButton";
import { Icon } from "@/components/ui/Icon";
import { colors, radius, spacing } from "@/theme/tokens";

const TABS = [
  { href: "/", icon: "home" },
  { href: "/reports", icon: "reports" },
  { href: "/analytics", icon: "analytics" },
  { href: "/profile", icon: "profile" },
] as const;

const MID = 2; // mic splices between tab index 1 and 2

export function FloatingDock() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.wrap, { bottom: Math.max(insets.bottom + spacing.md, spacing.xl) }]}
      pointerEvents="box-none"
    >
      <BlurView intensity={24} tint="light" style={styles.dock}>
        {TABS.slice(0, MID).map((tab) => (
          <DockButton
            key={tab.href}
            icon={tab.icon}
            isFocused={pathname === tab.href}
            onPress={() => router.navigate(tab.href)}
          />
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Record voice note"
          onPress={() => router.push("/record")}
          style={({ pressed }) => [
            styles.micWrap,
            { transform: [{ scale: pressed ? 0.94 : 1 }], opacity: pathname === "/record" ? 0.35 : 1 },
          ]}
        >
          <LinearGradient
            colors={colors.gradient.deepPlum}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.mic}
          >
            <Icon name="mic" size={24} color={colors.text.onDark} />
          </LinearGradient>
        </Pressable>

        {TABS.slice(MID).map((tab) => (
          <DockButton
            key={tab.href}
            icon={tab.icon}
            isFocused={pathname === tab.href}
            onPress={() => router.navigate(tab.href)}
          />
        ))}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.xl,
    right: spacing.xl,
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
  },
  micWrap: { paddingHorizontal: spacing.md },
  mic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent.glow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
