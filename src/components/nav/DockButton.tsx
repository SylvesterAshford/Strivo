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
          backgroundColor: isFocused ? colors.accent.soft : "transparent",
        }}
      >
        <Icon name={icon} size={22} color={isFocused ? colors.accent.pressed : colors.text.secondary} />
      </View>
    </Pressable>
  );
}
