"use client";

import { View, type RNStyle } from "@/rn";
import { colors, radius, spacing } from "@/theme/tokens";

// Shimmer placeholder. Premium apps show structured skeletons on first load
// instead of a spinner — it previews the layout and feels faster.
export function Skeleton({ height = 16, width = "100%", style }: { height?: number | string; width?: number | string; style?: RNStyle }) {
  return <View className="skeleton" style={[{ height, width }, style]} />;
}

// A card-shaped skeleton matching the dashboard card silhouette.
export function SkeletonCard() {
  return (
    <View
      style={{
        backgroundColor: colors.bg.surface,
        borderRadius: radius.pinnedCard,
        borderWidth: 1,
        borderColor: colors.border.default,
        padding: spacing["3xl"],
        gap: spacing.md,
      }}
    >
      <Skeleton height={10} width={72} />
      <Skeleton height={28} width="55%" />
      <Skeleton height={12} width="80%" />
      <Skeleton height={12} width="65%" />
    </View>
  );
}
