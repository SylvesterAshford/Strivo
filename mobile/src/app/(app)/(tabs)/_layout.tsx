import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { FloatingDock } from "@/components/nav/FloatingDock";

// The four primary destinations live here as tabs; the FloatingDock is their
// chrome. Detail screens (imports, manual entry, business profile, the
// add-data sheet) live one level up in (app) as Stack screens so they push
// over the tabs and `router.back()` returns to the tab you came from.
export default function TabsLayout() {
  return (
    <View style={styles.root}>
      <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }} />
      <FloatingDock />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
