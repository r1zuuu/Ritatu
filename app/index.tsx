import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { colors } from "../src/theme/colors";
import { useAuth } from "../src/providers/AuthProvider";
import { useUserProfile } from "../src/providers/UserProfileProvider";

export default function IndexRoute() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();

  if (authLoading || (user && profileLoading)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;
  if (!profile?.onboardingDone) return <Redirect href="/onboarding" />;
  return <Redirect href="/home" />;
}
