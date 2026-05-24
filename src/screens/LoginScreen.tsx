import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { useAuth } from "../providers/AuthProvider";
import { colors } from "../theme/colors";

export const LoginScreen = () => {
  const { signInWithGoogle, loading, error, isConfigured } = useAuth();

  return (
    <Screen>
      <View style={styles.wrap}>
        <View style={styles.brand}>
          <Text style={styles.logo}>Ritatu</Text>
          <Text style={styles.subtitle}>
            Tracker makro, który zawsze pozwala poprawić gramaturę przed zapisem.
          </Text>
        </View>

        <View style={styles.panel}>
          {!isConfigured ? (
            <Text style={styles.error}>
              Dodaj zmienne EXPO_PUBLIC_FIREBASE_* oraz EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.
            </Text>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {loading ? <ActivityIndicator color={colors.text} /> : null}
          <Button title="Kontynuuj z Google" onPress={signInWithGoogle} disabled={loading} />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "space-between",
  },
  brand: {
    paddingTop: 48,
    gap: 14,
  },
  logo: {
    color: colors.text,
    fontSize: 52,
    fontWeight: "900",
    letterSpacing: 0,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "700",
  },
  panel: {
    gap: 14,
  },
  error: {
    color: colors.danger,
    fontWeight: "800",
    lineHeight: 20,
  },
});
