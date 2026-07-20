import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "../components/Card";
import { Icon } from "../components/Icon";
import type { IconName } from "../components/Icon";
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
import { radius, space } from "../theme/layout";
import { typography } from "../theme/typography";

export const ProfileScreen = () => {
  const { user } = useAuth();
  const { profile, saveProfile } = useUserProfile();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<DeveloperSettings | null>(null);
  const [exportJson, setExportJson] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  useEffect(() => { void getDeveloperSettings().then(setSettings); }, []);

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
      setMessage("Zapisano.");
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
            const mealKeys = keys.filter((k) => k.startsWith("ritatu:meals:"));
            await AsyncStorage.multiRemove([...mealKeys, WEIGHTS_KEY, CUSTOM_PRODUCTS_KEY]);
            await clearProgressPhotos();
            setMessage("Wyczyszczono.");
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
      setMessage("Demo dodane.");
    } catch (e) {
      setMessage(`Błąd: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Goals */}
        <Text style={s.sectionLabel}>CELE DZIENNE</Text>
        <Animated.View entering={FadeInDown.duration(420)} style={s.goalGrid}>
          <GoalTile label="Kalorie" unit="kcal" value={kcal} onChangeText={setKcal} color={colors.accent} />
          <GoalTile label="Białko" unit="g" value={protein} onChangeText={setProtein} color={colors.protein} />
          <GoalTile label="Węglowodany" unit="g" value={carbs} onChangeText={setCarbs} color={colors.carbs} />
          <GoalTile label="Tłuszcze" unit="g" value={fat} onChangeText={setFat} color={colors.fat} />
        </Animated.View>

        <Pressable
          style={({ pressed }) => [s.saveBtn, pressed && s.saveBtnPressed]}
          onPress={() => void saveGoals()}
        >
          <Icon name="check" size={18} color={colors.warmBlack} />
          <Text style={s.saveBtnText}>
            {message === "Zapisano." ? "Zapisano" : "Zapisz cele"}
          </Text>
        </Pressable>

        {/* Dev tools */}
        <Text style={[s.sectionLabel, { marginTop: 28 }]}>NARZĘDZIA</Text>
        <Animated.View entering={FadeInDown.delay(100).duration(420)}>
          <Card style={s.toolList}>
            <ToolRow icon="sparkles" label="Seed danych demo" onPress={() => void seed()} first />
            <ToolRow icon="reset" label="Reset onboardingu" onPress={() => void resetOnboarding()} />
            <ToolRow
              icon="upload"
              label="Eksportuj dane JSON"
              onPress={async () => setExportJson(await exportLocalData())}
            />
            <ToolRow
              icon="trash"
              label="Wyczyść dane lokalne"
              onPress={clearMealsAndLocalData}
              danger
            />
          </Card>
        </Animated.View>

        {message && message !== "Zapisano." ? (
          <Text style={s.message}>{message}</Text>
        ) : null}

        {settings?.seededDemoDataAt ? (
          <Text style={s.meta}>
            Ostatni seed: {settings.seededDemoDataAt.toLocaleString("pl-PL")}
          </Text>
        ) : null}

        {exportJson ? (
          <TextInput
            style={s.exportBox}
            value={exportJson}
            multiline
            editable={false}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
};

function GoalTile({
  label, unit, value, onChangeText, color,
}: {
  label: string; unit: string; value: string;
  onChangeText: (v: string) => void; color: string;
}) {
  return (
    <Card style={s.tile}>
      <View style={[s.tileBar, { backgroundColor: color }]} />
      <Text style={s.tileLabel}>{label}</Text>
      <View style={s.tileInputRow}>
        <TextInput
          style={s.tileInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          selectTextOnFocus
          placeholderTextColor={colors.muted}
        />
        <Text style={[s.tileUnit, { color }]}>{unit}</Text>
      </View>
    </Card>
  );
}

function ToolRow({
  icon, label, onPress, danger = false, first = false,
}: {
  icon: IconName; label: string; onPress: () => void; danger?: boolean; first?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [s.toolRow, first && s.toolRowFirst, pressed && s.toolRowPressed]}
      onPress={onPress}
    >
      <View style={[s.toolIconWrap, danger && s.toolIconDanger]}>
        <Icon name={icon} size={18} color={danger ? colors.danger : colors.text} />
      </View>
      <Text style={[s.toolLabel, danger && s.toolLabelDanger]}>{label}</Text>
      <Icon name="chevron-right" size={16} color={colors.muted} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 32 },

  /* Section label */
  sectionLabel: {
    ...typography.stat,
    color: colors.muted,
    marginBottom: 10,
  },

  /* Goal tiles */
  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
    marginBottom: space.md,
  },
  tile: {
    borderRadius: radius.lg,
    gap: 10,
    overflow: "hidden",
    padding: space.lg,
    width: "47.5%",
  },
  tileBar: {
    borderRadius: 2,
    height: 3,
    width: 28,
  },
  tileLabel: {
    ...typography.label,
    color: colors.muted,
    fontSize: 11,
  },
  tileInputRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 4,
  },
  tileInput: {
    color: colors.text,
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 26,
    letterSpacing: -0.5,
    paddingVertical: 0,
  },
  tileUnit: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginBottom: 3,
  },

  /* Save button */
  saveBtn: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: 8,
    height: 52,
    justifyContent: "center",
    marginBottom: 28,
  },
  saveBtnPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  saveBtnText: {
    color: colors.warmBlack,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },

  /* Tool list */
  toolList: {
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  toolRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toolRowFirst: { borderTopWidth: 0 },
  toolRowPressed: { backgroundColor: colors.cardHov },
  toolIconWrap: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.borderMid,
    borderRadius: 10,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  toolIconDanger: { borderColor: "rgba(255,79,107,0.28)" },
  toolLabel: { ...typography.body, color: colors.text, flex: 1, fontSize: 14 },
  toolLabelDanger: { color: colors.danger },

  /* Misc */
  message: { ...typography.label, color: colors.green, marginTop: 12, textAlign: "center" },
  meta: { ...typography.label, color: colors.muted, marginTop: 10 },
  exportBox: {
    ...typography.label,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.mutedMid,
    marginTop: 12,
    maxHeight: 220,
    minHeight: 140,
    padding: 12,
    textAlignVertical: "top",
  },
});
