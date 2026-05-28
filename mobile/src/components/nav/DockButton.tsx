import { forwardRef } from "react";
import { Pressable, View, type PressableProps } from "react-native";
import type { Ref } from "react";
import { colors } from "@/theme/tokens";
import { Icon, type IconName } from "@/components/ui/Icon";

// Rendered via TabTrigger asChild — receives isFocused from expo-router/ui.
type Props = PressableProps & { icon: IconName; isFocused?: boolean };

export const DockButton = forwardRef(function DockButton(
  { icon, isFocused, ...rest }: Props,
  ref: Ref<View>,
) {
  return (
    <Pressable
      ref={ref}
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [{ flex: 1, alignItems: "center", opacity: pressed ? 0.7 : 1 }]}
      {...rest}
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
});
