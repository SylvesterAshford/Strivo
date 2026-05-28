import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { FloatingDock } from "@/components/nav/FloatingDock";

export default function AppTabsLayout() {
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
