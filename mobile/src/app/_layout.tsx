import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { useAppFonts } from "@/theme/fonts";
import { QueryProvider } from "@/lib/query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/stores/profile";
import { env, isSupabaseConfigured } from "@/lib/env";
import { colors } from "@/theme/tokens";

function RootNavigator() {
  const { session, initializing } = useAuth();
  const onboarded = useProfile((s) => s.onboarded);

  if (initializing) return <View style={{ flex: 1, backgroundColor: colors.bg.base }} />;

  // ── AUTH BYPASS (env-gated) ────────────────────────────────────────────────
  // Flip EXPO_PUBLIC_AUTH_BYPASS=false in mobile/.env to exercise the real
  // Supabase phone-OTP + onboarding flow. Bypass jumps straight into (app).
  if (env.authBypass) {
    return (
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg.base } }}>
        <Stack.Screen name="(app)" />
        <Stack.Screen name="record" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      </Stack>
    );
  }
  // ── end auth bypass ────────────────────────────────────────────────────────

  const configured = isSupabaseConfigured();
  const authed = configured ? !!session : true;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg.base } }}>
      <Stack.Protected guard={configured && !session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={authed && !onboarded}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>

      <Stack.Protected guard={authed && onboarded}>
        <Stack.Screen name="(app)" />
        <Stack.Screen name="record" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const { fontsLoaded } = useAppFonts();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            {fontsLoaded ? <RootNavigator /> : <View style={{ flex: 1, backgroundColor: colors.bg.base }} />}
          </AuthProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
