"use client";

import { View, StyleSheet, Pressable } from "@/rn";
import { useRouter } from "@/rn/router";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { colors, spacing } from "@/theme/tokens";

export function SubHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
        <Icon name="arrow-left" size={20} color={colors.text.primary} />
      </Pressable>
      <AppText variant="subhead" color="primary" style={{ flex: 1 }}>
        {title}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
