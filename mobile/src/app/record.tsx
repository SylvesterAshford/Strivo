import { View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { colors, spacing } from "@/theme/tokens";
import { my } from "@/i18n/my";

// Phase 1 stub — the full record + transcribe + extract pipeline is Phase 2.
// Renders the mic stage and a way back so the dock action is verifiable now.
export default function RecordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.base, paddingTop: insets.top + spacing["3xl"], paddingHorizontal: spacing.sectionX, paddingBottom: insets.bottom + spacing["3xl"] }}>
      <AppText variant="subhead" style={{ textAlign: "center" }}>
        {my.record.title}
      </AppText>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <LinearGradient
          colors={colors.gradient.deepPlum}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: colors.accent.glow,
            shadowOpacity: 1,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 6 },
          }}
        >
          <Icon name="mic" size={40} color={colors.text.onDark} />
        </LinearGradient>
        <AppText variant="caption" color="secondary" style={{ marginTop: spacing.xl }}>
          {my.record.listening}
        </AppText>
      </View>

      <Button label={my.common.cancel} variant="secondary" onPress={() => router.back()} />
    </View>
  );
}
