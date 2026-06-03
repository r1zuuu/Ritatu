import { View } from "react-native";
import { HistoryScreen } from "../src/screens/HistoryScreen";
import { BottomTabBar } from "../src/components/BottomTabBar";
import { colors } from "../src/theme/colors";

export default function HistoryTab() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HistoryScreen />
      <BottomTabBar />
    </View>
  );
}
