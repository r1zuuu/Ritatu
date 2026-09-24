import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { FAB_CLEARANCE } from "../components/BottomTabBar";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Icon } from "../components/Icon";
import type { IconName } from "../components/Icon";
import { Screen } from "../components/Screen";
import { calculateKcal, round } from "../core/macroCalculator";
import { exportDaysCsv, exportMealsCsv } from "../data/csvExport";
import {
  CUSTOM_PRODUCTS_KEY,
  getDeveloperSettings,
  seedDemoData,
  WEIGHTS_KEY,
} from "../data/developerRepository";
import { clearProgressPhotos } from "../data/progressPhotoRepository";
import type { ActivityLevel, DeveloperSettings, GoalType } from "../data/types";
import { getWeights } from "../data/weightRepository";
import { useAuth } from "../providers/AuthProvider";
import { useUserProfile } from "../providers/UserProfileProvider";
import { colors } from "../theme/colors";
import { radius, space } from "../theme/layout";
import { fontFamilies, typography } from "../theme/typography";

const GOAL_LABEL: Record<GoalType, string> = { lose: "Redukcja", maintain: "Utrzymanie", gain: "Budowa masy" };
const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: "Siedzący tryb",
  light: "Lekka aktywność",
  moderate: "Umiarkowana aktywność",
  active: "Wysoka aktywność",
};

type Notice = { tone: "ok" | "error"; text: string; at: "goals" | "tools" };

// Empty or invalid input is null, never 0: a zero goal would divide by zero
// in every progress bar.
const parsePositive = (value: string) => {
  const n = Number(value.replace(",", "."));
  return value.trim() && Number.isFinite(n) && n > 0 ? n : null;
};

export const ProfileScreen = () => {
  const { user } = useAuth();
  const { profile, saveProfile } = useUserProfile();
  const [settings, setSettings] = useState<DeveloperSettings | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [devOpen, setDevOpen] = useState(false);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);

  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [minKcal, setMinKcal] = useState("");

  useEffect(() => { void getDeveloperSettings().then(setSettings); }, []);

  // Weight lives in Pomiary; show the latest entry, not the onboarding value.
  useFocusEffect(
    useCallback(() => {
      void getWeights().then((w) => setLatestWeight(w.at(-1)?.weightKg ?? null));
    }, []),
  );

  useEffect(() => {
    if (!profile) return;
    setKcal(String(Math.round(profile.goalKcal ?? 0)));
    setProtein(String(Math.round(profile.goalProteinG ?? 0)));
    setCarbs(String(Math.round(profile.goalCarbsG ?? 0)));
    setFat(String(Math.round(profile.goalFatG ?? 0)));
    setMinKcal(profile.minCountedKcal ? String(Math.round(profile.minCountedKcal)) : "");
  }, [profile]);

  const show = (next: Notice) => {
    setNotice(next);
    if (next.tone === "ok") setTimeout(() => setNotice((n) => (n === next ? null : n)), 2500);
  };

  const goals = { kcal: parsePositive(kcal), protein: parsePositive(protein), carbs: parsePositive(carbs), fat: parsePositive(fat) };
  const minKcalValue = parsePositive(minKcal);
  const goalsValid = Object.values(goals).every((v) => v !== null) && (minKcal.trim() === "" || minKcalValue !== null);
  const macroKcal = goals.protein && goals.carbs && goals.fat ? calculateKcal(goals.protein, goals.carbs, goals.fat) : null;
  // Macros and the kcal goal are edited separately and can drift apart.
  const macroMismatch = macroKcal !== null && goals.kcal !== null && Math.abs(macroKcal - goals.kcal) > goals.kcal * 0.05;

  const saveGoals = async () => {
    if (!profile || !goalsValid) return;
    try {
      await saveProfile({
        ...profile,
        goalKcal: goals.kcal,
        goalProteinG: goals.protein,
        goalCarbsG: goals.carbs,
        goalFatG: goals.fat,
        minCountedKcal: minKcalValue,
      });
      show({ tone: "ok", text: "Zapisano cele.", at: "goals" });
    } catch (e) {
      show({ tone: "error", text: `Nie udało się zapisać: ${e instanceof Error ? e.message : String(e)}`, at: "goals" });
    }
  };

  const confirm = (title: string, body: string, action: string, run: () => Promise<void>) =>
    Alert.alert(title, body, [
      { text: "Anuluj", style: "cancel" },
      { text: action, style: "destructive", onPress: () => void run() },
    ]);

  const toolError = (e: unknown) =>
    show({ tone: "error", text: `Błąd: ${e instanceof Error ? e.message : String(e)}`, at: "tools" });

  const clearAll = () =>
    confirm(
      "Wyczyścić dane?",
      "Usunięte zostaną wszystkie posiłki, pomiary, zdjęcia i własne produkty. Tej operacji nie można cofnąć.",
      "Wyczyść",
      async () => {
        try {
          const keys = await AsyncStorage.getAllKeys();
          const mealKeys = keys.filter((k) => k.startsWith("ritatu:meals:"));
          await AsyncStorage.multiRemove([...mealKeys, WEIGHTS_KEY, CUSTOM_PRODUCTS_KEY]);
          await clearProgressPhotos();
          show({ tone: "ok", text: "Wyczyszczono dane.", at: "tools" });
        } catch (e) { toolError(e); }
      },
    );

  const seed = () =>
    confirm(
      "Wgrać dane demo?",
      "Nadpisze posiłki z ostatnich 7 dni i wszystkie pomiary wagi, a zdjęcia postępu zostaną usunięte.",
      "Wgraj demo",
      async () => {
        try {
          await seedDemoData(user.uid, profile);
          setSettings(await getDeveloperSettings());
          show({ tone: "ok", text: "Dodano dane demo.", at: "tools" });
        } catch (e) { toolError(e); }
      },
    );

  const resetOnboarding = () =>
    confirm(
      "Przejść onboarding od nowa?",
      "Cele kalorii i makr zostaną wyliczone ponownie i nadpiszą obecne.",
      "Zacznij od nowa",
      async () => {
        if (!profile) return;
        await saveProfile({ ...profile, onboardingDone: false });
        router.replace("/onboarding");
      },
    );

  const runExport = async (exporter: (uid: string) => Promise<"shared" | "unavailable">) => {
    try {
      const result = await exporter(user.uid);
      show(result === "shared"
        ? { tone: "ok", text: "Wyeksportowano.", at: "tools" }
        : { tone: "error", text: "Udostępnianie plików nie działa na tej platformie.", at: "tools" });
    } catch (e) { toolError(e); }
  };

  const weightKg = latestWeight ?? profile?.weightKg ?? null;
  const dataRows: Array<[string, string]> = [
    ["Waga", weightKg ? `${round(weightKg, 1)} kg` : "brak"],
    ["Wzrost", profile?.heightCm ? `${round(profile.heightCm)} cm` : "brak"],
    ["Wiek", profile?.age ? `${round(profile.age)} lat` : "brak"],
    ["Cel", profile?.goalType
      ? `${GOAL_LABEL[profile.goalType]}${profile.targetWeightKg ? ` do ${round(profile.targetWeightKg, 1)} kg` : ""}`
      : "brak"],
    ["Aktywność", profile?.activityLevel ? ACTIVITY_LABEL[profile.activityLevel] : "brak"],
  ];

  const noticeFor = (at: Notice["at"]) =>
    notice?.at === at ? (
      <Text style={[s.notice, notice.tone === "error" && s.noticeError]}>{notice.text}</Text>
    ) : null;

  return (
    <Screen noBottomInset padded={false}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: FAB_CLEARANCE }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.eyebrow}>Profil</Text>
        <Text style={s.title}>Ty i Twoje cele</Text>

        <Animated.View entering={FadeInDown.duration(320)}>
          <Card style={s.dataCard}>
            {dataRows.map(([label, value], i) => (
              <View key={label} style={[s.dataRow, i > 0 && s.dataRowBorder]}>
                <Text style={s.dataLabel}>{label}</Text>
                <Text style={s.dataValue}>{value}</Text>
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [s.editRow, pressed && s.rowPressed]}
              onPress={() => router.push({ pathname: "/onboarding", params: { edit: "1" } })}
            >
              <Icon name="edit" size={18} color={colors.accent} />
              <Text style={s.editText}>Edytuj dane i przelicz cele</Text>
              <Icon name="chevron-right" size={16} color={colors.muted} />
            </Pressable>
          </Card>
        </Animated.View>

        <Text style={s.sectionLabel}>Cele dzienne</Text>
        <Animated.View entering={FadeInDown.delay(60).duration(320)} style={s.goalGrid}>
          <GoalTile label="Kalorie" unit="kcal" value={kcal} onChangeText={setKcal} color={colors.accent} />
          <GoalTile label="Białko" unit="g" value={protein} onChangeText={setProtein} color={colors.protein} />
          <GoalTile label="Węglowodany" unit="g" value={carbs} onChangeText={setCarbs} color={colors.carbs} />
          <GoalTile label="Tłuszcze" unit="g" value={fat} onChangeText={setFat} color={colors.fat} />
        </Animated.View>
        {macroMismatch ? (
          <Text style={s.hint}>
            Z makr wychodzi {round(macroKcal ?? 0)} kcal, a cel kalorii to {round(goals.kcal ?? 0)}.
          </Text>
        ) : null}

        <Card style={s.thresholdCard}>
          <View style={s.thresholdHead}>
            <Text style={s.thresholdTitle}>Próg liczenia dnia</Text>
            <View style={s.thresholdInputRow}>
            <TextInput
              accessibilityLabel="Próg liczenia dnia w kcal"
              style={s.thresholdInput}
              value={minKcal}
              onChangeText={setMinKcal}
              keyboardType="number-pad"
              placeholder="brak"
              placeholderTextColor={colors.muted}
              selectTextOnFocus
            />
              <Text style={s.tileUnit}>kcal</Text>
            </View>
          </View>
          <Text style={s.thresholdBody}>
            Opcjonalnie. Dni z mniejszą liczbą kcal traktujemy jak niezapisane: wypadają ze średnich i serii,
            a w kalendarzu są przekreślone.
          </Text>
        </Card>

        <Button title="Zapisz cele" icon="check" disabled={!goalsValid} onPress={() => void saveGoals()} />
        {!goalsValid ? <Text style={s.hint}>Każdy cel musi być liczbą większą od zera.</Text> : noticeFor("goals")}

        <Text style={s.sectionLabel}>Dane</Text>
        <Card style={s.toolList}>
          <ToolRow icon="upload" label="Eksportuj posiłki (CSV)" onPress={() => void runExport(exportMealsCsv)} first />
          <ToolRow icon="upload" label="Eksportuj dni (CSV)" onPress={() => void runExport(exportDaysCsv)} />
        </Card>
        {noticeFor("tools")}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: devOpen }}
          style={s.devToggle}
          onPress={() => setDevOpen((v) => !v)}
        >
          <Text style={s.sectionLabelInline}>Dla dewelopera</Text>
          <Icon name={devOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
        </Pressable>
        {devOpen ? (
          <Card style={s.toolList}>
            <ToolRow icon="sparkles" label="Wgraj dane demo" onPress={seed} first />
            <ToolRow icon="reset" label="Onboarding od nowa" onPress={resetOnboarding} />
            <ToolRow icon="trash" label="Wyczyść wszystkie dane" onPress={clearAll} danger />
          </Card>
        ) : null}
        {devOpen && settings?.seededDemoDataAt ? (
          <Text style={s.meta}>Ostatnie demo: {settings.seededDemoDataAt.toLocaleString("pl-PL")}</Text>
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
          accessibilityLabel={`Cel: ${label}`}
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
      accessibilityRole="button"
      style={({ pressed }) => [s.toolRow, first && s.toolRowFirst, pressed && s.rowPressed]}
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
  scroll: { paddingHorizontal: space.xl, paddingTop: space.xl },
  eyebrow: { ...typography.stat, color: colors.accent },
  title: { ...typography.title, color: colors.text, marginBottom: 18, marginTop: 4 },

  sectionLabel: { ...typography.stat, color: colors.mutedMid, marginBottom: 10, marginTop: 28 },
  sectionLabelInline: { ...typography.stat, color: colors.mutedMid },

  dataCard: { overflow: "hidden" },
  dataRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  dataRowBorder: { borderTopColor: colors.border, borderTopWidth: 1 },
  dataLabel: { ...typography.caption, color: colors.mutedMid },
  dataValue: { ...typography.label, color: colors.text, fontSize: 13 },
  editRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  editText: { ...typography.label, color: colors.accent, flex: 1, fontSize: 14 },
  rowPressed: { backgroundColor: colors.cardHov },

  goalGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.md, marginBottom: space.md },
  tile: { borderRadius: radius.lg, gap: 10, overflow: "hidden", padding: space.lg, width: "47.5%" },
  tileBar: { borderRadius: 2, height: 3, width: 28 },
  tileLabel: { ...typography.label, color: colors.mutedMid },
  tileInputRow: { alignItems: "flex-end", flexDirection: "row", gap: 4 },
  tileInput: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.semibold,
    fontSize: 26,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
    minWidth: 0,
    paddingVertical: 0,
  },
  tileUnit: { ...typography.micro, color: colors.mutedMid, marginBottom: 4 },

  thresholdCard: { gap: 10, marginBottom: space.lg, padding: space.lg },
  thresholdHead: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  thresholdTitle: { ...typography.label, color: colors.text, flex: 1, fontSize: 14 },
  thresholdBody: { ...typography.caption, color: colors.mutedMid },
  thresholdInputRow: {
    alignItems: "flex-end",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.control,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  thresholdInput: {
    color: colors.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 20,
    fontVariant: ["tabular-nums"],
    paddingVertical: 0,
    textAlign: "right",
    width: 72,
  },

  hint: { ...typography.caption, color: colors.mutedMid, marginTop: 8 },
  notice: { ...typography.label, color: colors.green, marginTop: 10, textAlign: "center" },
  noticeError: { color: colors.danger },

  toolList: { borderRadius: radius.lg, overflow: "hidden" },
  toolRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  toolRowFirst: { borderTopWidth: 0 },
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
  toolIconDanger: { borderColor: colors.dangerA },
  toolLabel: { ...typography.body, color: colors.text, flex: 1 },
  toolLabelDanger: { color: colors.danger },

  devToggle: { alignItems: "center", flexDirection: "row", gap: 6, marginBottom: 10, marginTop: 28, minHeight: 44 },
  meta: { ...typography.micro, color: colors.muted, marginTop: 10 },
});
