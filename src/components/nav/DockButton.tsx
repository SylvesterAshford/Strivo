"use client";

import { Pressable, View } from "@/rn";
import { colors } from "@/theme/tokens";
import { Icon, type IconName } from "@/components/ui/Icon";

export function DockButton({
  icon,
  isFocused,
  onPress,
}: {
  icon: IconName;
  isFocused?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityState={{ selected: isFocused }}
      onPress={onPress}
      style={({ pressed }) => [{ flex: 1, alignItems: "center", opacity: pressed ? 0.7 : 1 }]}
    >
      <View
        style={{
          width: 44,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          // Active tab is a bright glass pill with the violet identity accent,
          // matching the desktop sidebar's active item.
          backgroundColor: isFocused ? "rgba(255,255,255,0.72)" : "transparent",
          borderWidth: isFocused ? 1 : 0,
          borderColor: "rgba(255,255,255,0.7)",
          boxShadow: isFocused ? "inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 8px rgba(124,58,237,0.16)" : undefined,
        }}
      >
        <Icon name={icon} size={22} color={isFocused ? colors.identity.purple : colors.text.secondary} />
      </View>
    </Pressable>
  );
}
