import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { Screen } from "../components/Screen";
import {
  CUSTOM_PRODUCTS_KEY,
  exportLocalData,
  getDeveloperSettings,
  saveDeveloperSettings,
  seedDemoData,
  WEIGHTS_KEY,
} from "../data/developerRepository";
import { clearProgressPhotos } from "../data/progressPhotoRepository";
import type { DeveloperSettings } from "../data/types";
import { useAuth } from "../providers/AuthProvider";
import { useUserProfile } from "../providers/UserProfileProvider";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

export const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const { profile, saveProfile } = useUserProfile();
  const [settings, setSettings] = useState<DeveloperSettings | null>(null);
  const [exportJson, setExportJson] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void getDeveloperSettings().then(setSettings);
  }, []);

  const updateSettings = async (next: DeveloperSettings) => {
    setSettings(next);
    await saveDeveloperSettings(next);
  };

  const clearMealsAndLocalData = async () => {
    const keys = await AsyncStorage.getAllKeys();
    const mealKeys = keys.filter((key) => key.startsWith("ritatu:meals:"));
    await AsyncStorage.multiRemove([...mealKeys, WEIGHTS_KEY, CUSTOM_PRODUCTS_KEY]);
    await clearProgressPhotos();
    setMessage("Wyczyszczono posiłki, pomiary, zdjęcia i produkty własne.");
  };

  const resetOnboarding = async () => {
    if (!profile) return;
    await saveProfile({ ...profile, onboardingDone: false });
    router.replace("/onboarding");
  };

  const seed = async () => {
    if (!user) return;
    await seedDemoData(user.uid, profile);
    setSettings(await getDeveloperSettings());
    setMessage("Dodano dane demo. Wróć na Home, aby je zobaczyć.");
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Icon name="settings" size={24} color={colors.accent} />
          </View>
          <Text style={styles.eyebrow}>Profil</Text>
          <Text style={styles.title}>{profile?.displayName ?? profile?.email ?? "Ritatu"}</Text>
        </View>

        <View style={styles.card}>
          <Metric label="Kalorie" value={`${Math.round(profile?.goalKcal ?? 0)} kcal`} />
          <Metric label="Białko" value={`${Math.round(profile?.goalProteinG ?? 0)} g`} />
          <Metric label="Węgle" value={`${Math.round(profile?.goalCarbsG ?? 0)} g`} />
          <Metric label="Tłuszcze" value={`${Math.round(profile?.goalFatG ?? 0)} g`} />
        </View>

        <View style={styles.devCard}>
          <View style={styles.devHeader}>
            <Icon name="settings" size={20} color={colors.accent} />
            <Text style={styles.devTitle}>Opcje developerskie</Text>
          </View>
          <Text style={styles.devText}>Lokalne narzędzia do testowania tej prywatnej wersji aplikacji.</Text>

          {settings ? (
            <View style={styles.toggles}>
              <Toggle
                label="Mock skanera"
                active={settings.mockBarcodeEnabled}
                onPress={() => void updateSettings({ ...settings, mockBarcodeEnabled: !settings.mockBarcodeEnabled })}
              />
              <Toggle
                label="Mock AI zdjęcia"
                active={settings.mockPhotoAiEnabled}
                onPress={() => void updateSettings({ ...settings, mockPhotoAiEnabled: !settings.mockPhotoAiEnabled })}
              />
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button title="Seed demo" icon="sparkles" onPress={() => void seed()} />
            <Button title="Reset onboardingu" icon="reset" variant="secondary" onPress={() => void resetOnboarding()} />
            <Button title="Wyczyść dane lokalne" icon="trash" variant="danger" onPress={() => void clearMealsAndLocalData()} />
            <Button
              title="Eksport JSON"
              icon="upload"
              variant="secondary"
              onPress={async () => setExportJson(await exportLocalData())}
            />
          </View>

          {message ? <Text style={styles.message}>{message}</Text> : null}
          {settings?.seededDemoDataAt ? (
            <Text style={styles.devText}>Ostatni seed: {settings.seededDemoDataAt.toLocaleString("pl-PL")}</Text>
          ) : null}
          {exportJson ? (
            <TextInput style={styles.exportBox} value={exportJson} multiline editable={false} />
          ) : null}
        </View>

        <Button title="Wyloguj" icon="logout" variant="secondary" onPress={() => void signOut()} />
      </ScrollView>
    </Screen>
  );
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function Toggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.toggle, active && styles.toggleActive, pressed && styles.pressed]} onPress={onPress}>
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
      <View style={[styles.switchTrack, active && styles.switchTrackActive]}>
        <View style={[styles.switchKnob, active && styles.switchKnobActive]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 16, padding: 20, paddingBottom: 32 },
  header: { gap: 8 },
  avatar: { alignItems: "center", backgroundColor: colors.accentA, borderColor: colors.accentB, borderRadius: 18, borderWidth: 1, height: 56, justifyContent: "center", width: 56 },
  eyebrow: { ...typography.label, color: colors.accent, textTransform: "uppercase" },
  title: { ...typography.title, color: colors.text },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, borderWidth: 1, padding: 16 },
  metricRow: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  metricLabel: { ...typography.label, color: colors.muted },
  metricValue: { ...typography.section, color: colors.text },
  devCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, gap: 14, padding: 16 },
  devHeader: { alignItems: "center", flexDirection: "row", gap: 8 },
  devTitle: { ...typography.section, color: colors.text },
  devText: { ...typography.body, color: colors.muted },
  toggles: { gap: 8 },
  toggle: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 12 },
  toggleActive: { borderColor: colors.accentB },
  toggleText: { ...typography.label, color: colors.text },
  toggleTextActive: { color: colors.accent },
  switchTrack: { backgroundColor: colors.borderMid, borderRadius: 999, height: 24, padding: 3, width: 46 },
  switchTrackActive: { backgroundColor: colors.accent },
  switchKnob: { backgroundColor: colors.text, borderRadius: 9, height: 18, width: 18 },
  switchKnobActive: { transform: [{ translateX: 22 }], backgroundColor: colors.warmBlack },
  actions: { gap: 10 },
  message: { ...typography.label, color: colors.green },
  exportBox: { ...typography.label, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.mutedMid, maxHeight: 220, minHeight: 140, padding: 12, textAlignVertical: "top" },
  pressed: { opacity: 0.86, transform: [{ scale: 0.96 }] },
});
