import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { MaterialSymbols_400Regular } from "@expo-google-fonts/material-symbols";
import { AuthProvider } from "../src/providers/AuthProvider";
import { MealsProvider } from "../src/providers/MealsProvider";
import { UserProfileProvider } from "../src/providers/UserProfileProvider";
import { View } from "react-native";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    MaterialSymbols_400Regular,
  });

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: "#0A0A0E" }} />;

  return (
    <AuthProvider>
      <UserProfileProvider>
        <MealsProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }} />
        </MealsProvider>
      </UserProfileProvider>
    </AuthProvider>
  );
}
