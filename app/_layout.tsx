import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../src/providers/AuthProvider";
import { MealsProvider } from "../src/providers/MealsProvider";
import { UserProfileProvider } from "../src/providers/UserProfileProvider";

export default function RootLayout() {
  return (
    <AuthProvider>
      <UserProfileProvider>
        <MealsProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </MealsProvider>
      </UserProfileProvider>
    </AuthProvider>
  );
}
