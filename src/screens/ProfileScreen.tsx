import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { Screen } from "../components/Screen";
import {
  CUSTOM_PRODUCTS_KEY,
  exportLocalData,
  getDeveloperSettings,
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
  const { user } = useAuth();
  const { profile, saveProfile } = useUserProfile();
  const [settings, setSettings] = useState<DeveloperSettings | null>(null);
  const [exportJson, setExportJson] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  useEffect(() => {
    void getDeveloperSettings().then(setSettings);
  }, []);

  useEffect(() => {
    if (!profile) return;
    setKcal(String(Math.round(profile.goalKcal ?? 0)));
    setProtein(String(Math.round(profile.goalProteinG ?? 0)));
    setCarbs(String(Math.round(profile.goalCarbsG ?? 0)));
    setFat(String(Math.round(profile.goalFatG ?? 0)));
  }, [profile]);

  const parseGoal = (val: string) => {
    const n = parseFloat(val.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const saveGoals = async () => {
    if (!profile) return;
    try {
      await saveProfile({
        ...profile,
        goalKcal: parseGoal(kcal) ?? profile.goalKcal,
        goalProteinG: parseGoal(protein) ?? profile.goalProteinG,
        goalCarbsG: parseGoal(carbs) ?? profile.goalCarbsG,
        goalFatG: parseGoal(fat) ?? profile.goalFatG,
      });
      setMessage("Cele zapisane.");
      setTimeout(() => setMessage(null), 2500);
    } catch (e) {
      setMessage(`Błąd: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const clearMealsAndLocalData = () => {
    Alert.alert(
      "Wyczyścić dane?",
      "Usunięte zostaną wszystkie posiłki, pomiary, zdjęcia i własne produkty. Tej operacji nie można cofnąć.",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Wyczyść",
          style: "destructive",
          onPress: async () => {
            const keys = await AsyncStorage.getAllKeys();
            const mealKeys = keys.filter((key) => key.startsWith("ritatu:meals:"));
            await AsyncStorage.multiRemove([...mealKeys, WEIGHTS_KEY, CUSTOM_PRODUCTS_KEY]);
            await clearProgressPhotos();
            setMessage("Wyczyszczono dane.");
          },
        },
      ],
    );
  };

  const resetOnboarding = async () => {
    if (!profile) return;
    await saveProfile({ ...profile, onboardingDone: false });
    router.replace("/onboarding");
  };

  const seed = async () => {
    if (!user) { setMessage("Błąd: brak użytkownika."); return; }
    try {
      await seedDemoData(user.uid, profile);
      setSettings(await getDeveloperSettings());
      setMessage("Dodano dane demo. Wróć na Home, aby je zobaczyć.");
    } catch (e) {
      setMessage(`Błąd seed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.goalsCard}>
          <View style={styles.cardHeader}>
            <Icon name="gauge" size={20} color={colors.accent} />
            <Text style={styles.cardTitle}>Cele dzienne</Text>
          </View>
          <View style={styles.goalRow}>
            <GoalField label="Kalorie" unit="kcal" value={kcal} onChangeText={setKcal} />
            <GoalField label="Białko" unit="g" value={protein} onChangeText={setProtein} />
          </View>
          <View style={styles.goalRow}>
            <GoalField label="Węglowodany" unit="g" value={carbs} onChangeText={setCarbs} />
            <GoalField label="Tłuszcze" unit="g" value={fat} onChangeText={setFat} />
          </View>
          <Button title="Zapisz cele" icon="check" onPress={() => void saveGoals()} />
        </View>

        <View style={styles.devCard}>
          <View style={styles.cardHeader}>
            <Icon name="settings" size={20} color={colors.accent} />
            <Text style={styles.cardTitle}>Opcje developerskie</Text>
          </View>
          <Text style={styles.devText}>Lokalne narzędzia do testowania tej prywatnej wersji aplikacji.</Text>

          <View style={styles.actions}>
            <Button title="Seed demo" icon="sparkles" variant="secondary" onPress={() => void seed()} />
            <Button title="Reset onboardingu" icon="reset" variant="secondary" onPress={() => void resetOnboarding()} />
            <Button title="Wyczyść dane lokalne" icon="trash" variant="secondary" onPress={clearMealsAndLocalData} />
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
      </ScrollView>
    </Screen>
  );
};

function GoalField({ label, unit, value, onChangeText }: {
  label: string;
  unit: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View style={styles.goalField}>
      <Text style={styles.goalLabel}>{label}</Text>
      <View style={styles.goalInputRow}>
        <TextInput
          style={styles.goalInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          selectTextOnFocus
        />
        <Text style={styles.goalUnit}>{unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 16, padding: 20, paddingBottom: 32, paddingTop: 36 },
  goalsCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, gap: 14, padding: 16 },
  devCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, gap: 14, padding: 16 },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: 8 },
  cardTitle: { ...typography.section, color: colors.text },
  goalRow: { flexDirection: "row", gap: 10 },
  goalField: { flex: 1, gap: 6 },
  goalLabel: { ...typography.label, color: colors.muted },
  goalInputRow: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", paddingHorizontal: 12, height: 48 },
  goalInput: { flex: 1, ...typography.section, color: colors.text },
  goalUnit: { ...typography.label, color: colors.mutedMid },
  devText: { ...typography.body, color: colors.muted },
  actions: { gap: 10 },
  message: { ...typography.label, color: colors.green },
  exportBox: { ...typography.label, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.mutedMid, maxHeight: 220, minHeight: 140, padding: 12, textAlignVertical: "top" },
});
