import { Stack } from "expo-router";
import { colors } from "@/theme/tokens";

// (app) is a Stack: the (tabs) group is the base, and every detail screen
// pushes over it. This makes `router.back()` return to the originating tab
// (not the default home tab, which is what happened when these were tabs).
export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg.base },
      }}
    >
      <Stack.Screen name="(tabs)" />
      {/* Add-data sheet + manual entry slide up as modals. */}
      <Stack.Screen name="record" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="manual-entry" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      {/* Import + edit flows push from the right; back returns to the previous screen. */}
      <Stack.Screen name="import-sales" />
      <Stack.Screen name="import-expenses" />
      <Stack.Screen name="import-products" />
      <Stack.Screen name="business-profile" />
      <Stack.Screen name="confirm-facts" />
    </Stack>
  );
}
