import { Stack } from "expo-router";
import { ThemeProvider, DarkTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../src/providers/AuthProvider";
import { MealsProvider } from "../src/providers/MealsProvider";
import { UserProfileProvider } from "../src/providers/UserProfileProvider";

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <AuthProvider>
        <UserProfileProvider>
          <MealsProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }} />
          </MealsProvider>
        </UserProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
