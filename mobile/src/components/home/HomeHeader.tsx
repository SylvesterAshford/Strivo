import { View, Pressable } from "react-native";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { colors, spacing } from "@/theme/tokens";
import { headerDate } from "@/lib/date";
import { my } from "@/i18n/my";

// design.md 4.1 region 1 — mono date, Burmese greeting, bell with unread dot.
export function HomeHeader({ name, hasUnread = false }: { name: string; hasUnread?: boolean }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: spacing["3xl"],
      }}
    >
      <View style={{ gap: 6 }}>
        <Eyebrow>{headerDate()}</Eyebrow>
        {/* paddingTop gives Myanmar diacritics room above the first line. */}
        <View style={{ paddingTop: 8 }}>
          <AppText variant="subhead">{my.greeting.hello(name)}</AppText>
        </View>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Notifications" hitSlop={8}>
        <View>
          <Icon name="bell" size={24} color={colors.text.secondary} />
          {hasUnread ? (
            <View
              style={{
                position: "absolute",
                top: -1,
                right: -1,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.accent.base,
              }}
            />
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}
