import { Redirect } from "expo-router";
import { View } from "react-native";
import { useUserProfile } from "../src/providers/UserProfileProvider";
import { colors } from "../src/theme/colors";

export default function IndexRoute() {
  const { profile, loading } = useUserProfile();

  // A local read, fast enough that a spinner would only flash.
  if (loading || !profile) return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  return <Redirect href={profile.onboardingDone ? "/home" : "/onboarding"} />;
}
