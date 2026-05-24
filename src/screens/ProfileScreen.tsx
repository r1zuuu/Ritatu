import { StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { useAuth } from "../providers/AuthProvider";
import { useUserProfile } from "../providers/UserProfileProvider";
import { colors } from "../theme/colors";

export const ProfileScreen = () => {
  const { signOut } = useAuth();
  const { profile } = useUserProfile();

  return (
    <Screen>
      <View style={styles.wrap}>
        <View>
          <Text style={styles.eyebrow}>Profil</Text>
          <Text style={styles.title}>{profile?.displayName ?? profile?.email ?? "Ritatu"}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.metric}>Cel: {Math.round(profile?.goalKcal ?? 0)} kcal</Text>
          <Text style={styles.metric}>Białko: {Math.round(profile?.goalProteinG ?? 0)} g</Text>
          <Text style={styles.metric}>Węgle: {Math.round(profile?.goalCarbsG ?? 0)} g</Text>
          <Text style={styles.metric}>Tłuszcze: {Math.round(profile?.goalFatG ?? 0)} g</Text>
        </View>
        <Button title="Wyloguj" variant="danger" onPress={() => void signOut()} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: 20,
  },
  eyebrow: {
    color: colors.muted,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
    marginTop: 8,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 10,
  },
  metric: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
});
