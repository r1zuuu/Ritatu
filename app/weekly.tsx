import { View } from "react-native";
import { WeeklyScreen } from "../src/screens/WeeklyScreen";
import { BottomTabBar } from "../src/components/BottomTabBar";
import { colors } from "../src/theme/colors";

export default function WeeklyTab() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <WeeklyScreen />
      <BottomTabBar />
    </View>
  );
}
