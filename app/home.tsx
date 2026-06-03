import { View } from "react-native";
import { HomeScreen } from "../src/screens/HomeScreen";
import { BottomTabBar } from "../src/components/BottomTabBar";
import { colors } from "../src/theme/colors";

export default function HomeTab() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HomeScreen />
      <BottomTabBar />
    </View>
  );
}
