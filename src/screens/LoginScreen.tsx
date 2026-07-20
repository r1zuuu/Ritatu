import { router } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../providers/AuthProvider";
import { colors } from "../theme/colors";

export const LoginScreen = () => {
  const { user, signIn, error } = useAuth();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (user) router.replace("/");
  }, [user]);

  const handleSignIn = async () => {
    setLoading(true);
    await signIn(login, password);
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.wrap, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Center: logo */}
      <View style={styles.center}>
        <View style={styles.logoBox}>
          <View style={styles.logoInner}>
            <View style={styles.logoCircle} />
            <View style={styles.logoCross} />
            <View style={styles.logoCrossH} />
          </View>
        </View>
        <Text style={styles.title}>RITATU</Text>
        <Text style={styles.sub}>twój dziennik żywieniowy</Text>
      </View>

      {/* Bottom: form */}
      <View style={styles.panel}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.field}>
          <Text style={styles.label}>Login</Text>
          <TextInput
            style={styles.input}
            value={login}
            onChangeText={setLogin}
            placeholder="login"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            returnKeyType="next"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Hasło</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            onSubmitEditing={() => { if (login && password && !loading) void handleSignIn(); }}
          />
        </View>

        <TouchableOpacity
          style={[styles.btn, (!login || !password || loading) && styles.btnDisabled]}
          onPress={handleSignIn}
          disabled={!login || !password || loading}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{loading ? "Logowanie..." : "Zaloguj się"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  logoBox: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: colors.accentA,
    borderWidth: 1.5,
    borderColor: colors.accentB,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  logoInner: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  logoCircle: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  logoCross: {
    position: "absolute",
    width: 2,
    height: 18,
    backgroundColor: colors.accent,
    borderRadius: 1,
  },
  logoCrossH: {
    position: "absolute",
    width: 18,
    height: 2,
    backgroundColor: colors.accent,
    borderRadius: 1,
    top: 18,
  },
  title: {
    color: colors.accent,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 1,
  },
  sub: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 2,
  },
  panel: {
    gap: 12,
  },
  field: {
    gap: 7,
  },
  label: {
    color: colors.mutedMid,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  btn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: colors.warmBlack,
    fontSize: 15,
    fontWeight: "700",
  },
  error: {
    color: colors.danger,
    fontWeight: "700",
    lineHeight: 20,
    fontSize: 13,
  },
});
