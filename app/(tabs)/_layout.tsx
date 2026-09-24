import { Tabs } from "expo-router/js-tabs";
import { BottomTabBar } from "../../src/components/BottomTabBar";
import { colors } from "../../src/theme/colors";

// Real tabs instead of router.replace inside a Stack: screens stay mounted, so
// the diary keeps its day and scroll, and the tab bar is not rebuilt per switch.
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        animation: "fade",
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="weekly" />
      <Tabs.Screen name="measurements" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
