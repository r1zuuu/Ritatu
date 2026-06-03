import { View } from "react-native";
import { ProfileScreen } from "../src/screens/ProfileScreen";
import { BottomTabBar } from "../src/components/BottomTabBar";
import { colors } from "../src/theme/colors";

export default function ProfileTab() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ProfileScreen />
      <BottomTabBar />
    </View>
  );
}
