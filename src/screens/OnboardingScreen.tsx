import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { SegmentedControl } from "../components/SegmentedControl";
import { TextField } from "../components/TextField";
import { formatTargetDate } from "../core/date";
import {
  calculateBMR,
  calculateGoalKcal,
  calculateMacros,
  calculateTDEE,
  validateTargetDate,
} from "../core/macroCalculator";
import type { ActivityLevel, Gender, GoalPace, GoalType } from "../data/types";
import { useUserProfile } from "../providers/UserProfileProvider";
import { colors } from "../theme/colors";

const num = (value: string) => Number(value.replace(",", "."));

export const OnboardingScreen = () => {
  const { profile, saveProfile } = useUserProfile();
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState<Gender>("male");
  const [age, setAge] = useState("25");
  const [weightKg, setWeightKg] = useState("80");
  const [heightCm, setHeightCm] = useState("180");
  const [goalType, setGoalType] = useState<GoalType>("maintain");
  const [goalPace, setGoalPace] = useState<GoalPace>("moderate");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);

  const parsedTargetDate = targetDate ? new Date(targetDate) : null;
  const dateValidation = useMemo(
    () =>
      goalType === "maintain"
        ? null
        : validateTargetDate(
            parsedTargetDate && !Number.isNaN(parsedTargetDate.getTime()) ? parsedTargetDate : null,
            0,
            goalPace,
          ),
    [goalPace, goalType, parsedTargetDate],
  );

  const canContinue =
    step !== 0 ||
    (num(age) >= 13 && num(weightKg) > 0 && num(heightCm) > 0 && Number.isFinite(num(age)));

  const finish = async () => {
    if (!profile) return;
    setSaving(true);

    const bmr = calculateBMR(num(weightKg), num(heightCm), num(age), gender);
    const tdee = calculateTDEE(bmr, activityLevel);
    const goalKcal = calculateGoalKcal(tdee, goalType, goalPace);
    const macros = calculateMacros(goalKcal, num(weightKg), goalType);

    await saveProfile({
      ...profile,
      weightKg: num(weightKg),
      heightCm: num(heightCm),
      age: Math.round(num(age)),
      gender,
      goalType,
      goalPace,
      activityLevel,
      targetDate:
        parsedTargetDate && !Number.isNaN(parsedTargetDate.getTime()) ? parsedTargetDate : null,
      goalKcal: macros.kcal,
      goalProteinG: macros.proteinG,
      goalCarbsG: macros.carbsG,
      goalFatG: macros.fatG,
      onboardingDone: true,
    });

    setSaving(false);
    router.replace("/home");
  };

  return (
    <Screen scroll>
      <Text style={styles.step}>Krok {step + 1} / 4</Text>
      {step === 0 ? (
        <View style={styles.section}>
          <Text style={styles.title}>Dane fizyczne</Text>
          <SegmentedControl
            value={gender}
            onChange={setGender}
            items={[
              { label: "Mężczyzna", value: "male" },
              { label: "Kobieta", value: "female" },
            ]}
          />
          <TextField label="Wiek" value={age} onChangeText={setAge} keyboardType="number-pad" />
          <TextField
            label="Waga kg"
            value={weightKg}
            onChangeText={setWeightKg}
            keyboardType="decimal-pad"
          />
          <TextField
            label="Wzrost cm"
            value={heightCm}
            onChangeText={setHeightCm}
            keyboardType="decimal-pad"
          />
        </View>
      ) : null}

      {step === 1 ? (
        <View style={styles.section}>
          <Text style={styles.title}>Cel</Text>
          <SegmentedControl
            value={goalType}
            onChange={setGoalType}
            items={[
              { label: "Redukcja", value: "lose" },
              { label: "Utrzymanie", value: "maintain" },
              { label: "Masa", value: "gain" },
            ]}
          />
          {goalType !== "maintain" ? (
            <SegmentedControl
              value={goalPace}
              onChange={setGoalPace}
              items={[
                { label: "Wolne", value: "slow" },
                { label: "Umiarkowane", value: "moderate" },
                { label: "Szybkie", value: "fast" },
              ]}
            />
          ) : null}
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.section}>
          <Text style={styles.title}>Aktywność</Text>
          <SegmentedControl
            value={activityLevel}
            onChange={setActivityLevel}
            items={[
              { label: "Siedzący", value: "sedentary" },
              { label: "Lekki", value: "light" },
              { label: "Umiarkowany", value: "moderate" },
              { label: "Bardzo aktywny", value: "active" },
            ]}
          />
        </View>
      ) : null}

      {step === 3 ? (
        <View style={styles.section}>
          <Text style={styles.title}>Data celu</Text>
          <TextField
            label="Opcjonalnie: RRRR-MM-DD"
            value={targetDate}
            onChangeText={setTargetDate}
            placeholder="2026-08-31"
          />
          {dateValidation ? (
            <View style={styles.callout}>
              <Text style={styles.calloutText}>
                {dateValidation.isRealistic
                  ? `Realistyczne — przy tym tempie zmiana wyniesie około ${dateValidation.estimatedChangeKg} kg.`
                  : `Za ambitne — minimalna realna data to ${formatTargetDate(dateValidation.realisticDate)}.`}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        {step > 0 ? <Button title="Wstecz" variant="secondary" onPress={() => setStep(step - 1)} /> : null}
        <Button
          title={step === 3 ? (saving ? "Zapisuję..." : "Zakończ") : "Dalej"}
          disabled={!canContinue || saving}
          onPress={() => (step === 3 ? void finish() : setStep(step + 1))}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  step: {
    color: colors.muted,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 14,
  },
  section: {
    gap: 18,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "900",
  },
  callout: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
  },
  calloutText: {
    color: colors.text,
    fontWeight: "800",
    lineHeight: 21,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 28,
  },
});
