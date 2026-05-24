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
import type { ActivityLevel, Gender, GoalType } from "../data/types";
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
  const [targetWeightKg, setTargetWeightKg] = useState("");

  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);

  // We are implicitly assuming "moderate" pace
  const implicitPace = "moderate";
  const numWeightKg = num(weightKg);
  const numTargetWeightKg = num(targetWeightKg);

  // Validation for step 1
  const numAge = num(age);
  const numHeightCm = num(heightCm);

  const isAgeValid = Number.isFinite(numAge) && numAge >= 13;
  const isWeightValid = Number.isFinite(numWeightKg) && numWeightKg > 0;
  const isHeightValid = Number.isFinite(numHeightCm) && numHeightCm > 0;

  const isTargetWeightValid = goalType === "maintain"
    ? true
    : (Number.isFinite(numTargetWeightKg) && numTargetWeightKg > 0 &&
       (goalType === "lose" ? numTargetWeightKg < numWeightKg : numTargetWeightKg > numWeightKg));

  const parsedTargetDate = targetDate ? new Date(targetDate) : null;
  const weightChangeKg = Math.abs(numTargetWeightKg - numWeightKg);

  const dateValidation = useMemo(
    () =>
      goalType === "maintain"
        ? null
        : validateTargetDate(
            parsedTargetDate && !Number.isNaN(parsedTargetDate.getTime()) ? parsedTargetDate : null,
            weightChangeKg,
            implicitPace,
          ),
    [implicitPace, goalType, parsedTargetDate, weightChangeKg],
  );

  const canContinueStep1 = isAgeValid && isWeightValid && isHeightValid;
  const canContinueStep2 = isTargetWeightValid;

  const canContinue =
    (step === 0 && canContinueStep1) ||
    (step === 1 && canContinueStep2) ||
    step > 1;

  const totalSteps = goalType === "maintain" ? 3 : 4;

  const finish = async () => {
    if (!profile) return;
    setSaving(true);

    const bmr = calculateBMR(numWeightKg, numHeightCm, numAge, gender);
    const tdee = calculateTDEE(bmr, activityLevel);
    const goalKcal = calculateGoalKcal(tdee, goalType, implicitPace);
    const macros = calculateMacros(goalKcal, numWeightKg, goalType);

    await saveProfile({
      ...profile,
      weightKg: numWeightKg,
      targetWeightKg: goalType === "maintain" ? null : numTargetWeightKg,
      heightCm: numHeightCm,
      age: Math.round(numAge),
      gender,
      goalType,
      goalPace: implicitPace,
      activityLevel,
      targetDate:
        goalType === "maintain"
          ? null
          : parsedTargetDate && !Number.isNaN(parsedTargetDate.getTime())
            ? parsedTargetDate
            : (dateValidation?.realisticDate ?? null),
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
      <Text style={styles.step}>Krok {step + 1} / {totalSteps}</Text>
      {step === 0 ? (
        <View style={styles.section} accessibilityState={{ selected: step === 0 }}>
          <Text style={styles.title}>Dane fizyczne</Text>
          <SegmentedControl
            value={gender}
            onChange={setGender}
            items={[
              { label: "Mężczyzna", value: "male" },
              { label: "Kobieta", value: "female" },
            ]}
          />
          <View>
            <TextField label="Wiek" value={age} onChangeText={setAge} keyboardType="number-pad" />
            {!isAgeValid && age !== "" && <Text style={styles.errorText}>Wiek musi być co najmniej 13.</Text>}
          </View>
          <View>
            <TextField
              label="Waga kg"
              value={weightKg}
              onChangeText={setWeightKg}
              keyboardType="decimal-pad"
            />
            {!isWeightValid && weightKg !== "" && <Text style={styles.errorText}>Waga musi być większa od 0.</Text>}
          </View>
          <View>
            <TextField
              label="Wzrost cm"
              value={heightCm}
              onChangeText={setHeightCm}
              keyboardType="decimal-pad"
            />
            {!isHeightValid && heightCm !== "" && <Text style={styles.errorText}>Wzrost musi być większy od 0.</Text>}
          </View>
        </View>
      ) : null}

      {step === 1 ? (
        <View style={styles.section} accessibilityState={{ selected: step === 1 }}>
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
            <View>
              <TextField
                label="Waga docelowa kg"
                value={targetWeightKg}
                onChangeText={setTargetWeightKg}
                keyboardType="decimal-pad"
              />
              {!isTargetWeightValid && targetWeightKg !== "" && (
                <Text style={styles.errorText}>
                  {goalType === "lose"
                    ? "Waga docelowa musi być mniejsza niż obecna."
                    : "Waga docelowa musi być większa niż obecna."}
                </Text>
              )}
            </View>
          ) : null}
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.section} accessibilityState={{ selected: step === 2 }}>
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

      {step === 3 && goalType !== "maintain" ? (
        <View style={styles.section} accessibilityState={{ selected: step === 3 }}>
          <Text style={styles.title}>Data celu</Text>
          {dateValidation ? (
            <View style={styles.callout}>
              <Text style={styles.calloutText}>
                Sugerowana data osiągnięcia celu: {formatTargetDate(dateValidation.realisticDate)}
              </Text>
            </View>
          ) : null}
          <TextField
            label="Opcjonalnie podaj własną: RRRR-MM-DD"
            value={targetDate}
            onChangeText={setTargetDate}
            placeholder={dateValidation ? formatTargetDate(dateValidation.realisticDate) : "2026-08-31"}
          />
          {dateValidation && targetDate !== "" ? (
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
          title={(step === totalSteps - 1) ? (saving ? "Zapisuję..." : "Zakończ") : "Dalej"}
          disabled={!canContinue || saving}
          onPress={() => ((step === totalSteps - 1) ? void finish() : setStep(step + 1))}
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
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
});
