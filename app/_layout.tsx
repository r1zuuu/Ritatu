import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { Barlow_300Light } from "@expo-google-fonts/barlow";
import { MaterialSymbols_200ExtraLight } from "@expo-google-fonts/material-symbols";
import { AuthProvider } from "../src/providers/AuthProvider";
import { MealsProvider } from "../src/providers/MealsProvider";
import { UserProfileProvider } from "../src/providers/UserProfileProvider";
import { View } from "react-native";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Barlow_300Light,
    MaterialSymbols_200ExtraLight,
  });

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: "#111009" }} />;

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
