import { View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { colors, spacing } from "@/theme/tokens";

interface Props {
  title: string;
}

export function SubHeader({ title }: Props) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={8}
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
      >
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
