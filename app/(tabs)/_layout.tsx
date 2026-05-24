import { Tabs } from "expo-router";
import { View } from "react-native";
import { colors } from "../../src/theme/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Dziennik",
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Historia",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
        }}
      />
    </Tabs>
  );
}
