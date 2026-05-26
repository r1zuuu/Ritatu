import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "../components/Icon";
import {
  calculateBMR,
  calculateGoalKcal,
  calculateMacros,
  calculateTDEE,
  validateTargetDate,
} from "../core/macroCalculator";
import type { ActivityLevel, DateValidationResult, Gender, GoalPace, GoalType } from "../data/types";
import { useUserProfile } from "../providers/UserProfileProvider";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

type StepKey = "gender" | "weight" | "height" | "age" | "goal" | "pace" | "activity" | "target";
type NumericField = "weight" | "height" | "age" | "targetWeight";

type OnboardingValues = {
  gender: Gender;
  weight: string;
  height: string;
  age: string;
  goal: GoalType;
  pace: GoalPace;
  activity: ActivityLevel;
  targetWeight: string;
  targetDate: string;
};

const BASE_STEPS: StepKey[] = ["gender", "weight", "height", "age", "goal", "pace", "activity", "target"];

const STEP_META: Record<StepKey, { title: string; subtitle: string; icon: IconName }> = {
  gender: {
    title: "Dane do wzoru",
    subtitle: "Płeć zmienia stałą we wzorze Mifflin-St Jeor.",
    icon: "activity",
  },
  weight: {
    title: "Ile ważysz?",
    subtitle: "Aktualna waga jest bazą do kalorii i białka.",
    icon: "weight",
  },
  height: {
    title: "Jaki masz wzrost?",
    subtitle: "Wzrost wpływa na podstawową przemianę materii.",
    icon: "bar-chart",
  },
  age: {
    title: "Ile masz lat?",
    subtitle: "Wiek zmienia dzienne zapotrzebowanie.",
    icon: "gauge",
  },
  goal: {
    title: "Jaki jest cel?",
    subtitle: "Na tej podstawie ustawimy bilans kalorii.",
    icon: "sparkles",
  },
  pace: {
    title: "Jakie tempo?",
    subtitle: "Bezpieczne tempo daje plan, którego da się trzymać.",
    icon: "gauge",
  },
  activity: {
    title: "Aktywność",
    subtitle: "TDEE to BMR pomnożone przez aktywność.",
    icon: "dumbbell",
  },
  target: {
    title: "Cel wagi",
    subtitle: "Opcjonalnie dodaj wagę i datę, sprawdzimy realizm planu.",
    icon: "check",
  },
};

const GOALS: Array<{ id: GoalType; label: string; subtitle: string; icon: IconName }> = [
  { id: "lose", label: "Redukcja", subtitle: "Deficyt kalorii", icon: "activity" },
  { id: "maintain", label: "Utrzymanie", subtitle: "Bilans kalorii", icon: "gauge" },
  { id: "gain", label: "Masa", subtitle: "Nadwyżka kalorii", icon: "dumbbell" },
];

const PACES: Array<{ id: GoalPace; label: string; subtitle: string; kcal: number }> = [
  { id: "slow", label: "Wolne", subtitle: "około 0.25 kg / tydz.", kcal: 275 },
  { id: "moderate", label: "Umiarkowane", subtitle: "około 0.5 kg / tydz.", kcal: 550 },
  { id: "fast", label: "Szybkie", subtitle: "około 0.75 kg / tydz.", kcal: 825 },
];

const ACTIVITIES: Array<{ id: ActivityLevel; label: string; subtitle: string }> = [
  { id: "sedentary", label: "Siedzący", subtitle: "Biuro, mało ruchu" },
  { id: "light", label: "Lekki", subtitle: "Spacery, 1-2 treningi" },
  { id: "moderate", label: "Umiarkowany", subtitle: "3-4 treningi tygodniowo" },
  { id: "active", label: "Bardzo aktywny", subtitle: "5+ treningów lub praca fizyczna" },
];

const parseDecimal = (value: string) => Number(value.replace(",", "."));
const formatNumber = (value: number, decimals = 1) => {
  const rounded = Number(value.toFixed(decimals));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

const parseDateInput = (value: string): Date | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null;
  }
  return date;
};

const formatDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function profileToValues(profile: import("../data/types").UserProfile | null): OnboardingValues {
  if (!profile) {
    return {
      gender: "male",
      weight: "",
      height: "",
      age: "",
      goal: "lose",
      pace: "moderate",
      activity: "moderate",
      targetWeight: "",
      targetDate: "",
    };
  }
  return {
    gender: profile.gender ?? "male",
    weight: profile.weightKg != null ? String(profile.weightKg) : "",
    height: profile.heightCm != null ? String(profile.heightCm) : "",
    age: profile.age != null ? String(profile.age) : "",
    goal: profile.goalType ?? "lose",
    pace: profile.goalPace ?? "moderate",
    activity: profile.activityLevel ?? "moderate",
    targetWeight: profile.targetWeightKg != null ? String(profile.targetWeightKg) : "",
    targetDate: profile.targetDate ? formatDate(profile.targetDate) : "",
  };
}

export const OnboardingScreen = () => {
  const insets = useSafeAreaInsets();
  const { profile, saveProfile } = useUserProfile();
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<OnboardingValues>(() => profileToValues(profile));

  const steps = useMemo(
    () => BASE_STEPS.filter((step) => values.goal !== "maintain" || (step !== "pace" && step !== "target")),
    [values.goal],
  );
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const meta = STEP_META[step];
  const isLast = stepIndex === steps.length - 1;

  const weight = parseDecimal(values.weight);
  const height = parseDecimal(values.height);
  const age = parseDecimal(values.age);
  const targetWeight = parseDecimal(values.targetWeight);
  const targetDate = parseDateInput(values.targetDate);

  const preview = useMemo(() => {
    if (![weight, height, age].every(Number.isFinite)) return null;
    const bmr = calculateBMR(weight, height, age, values.gender);
    const tdee = calculateTDEE(bmr, values.activity);
    const goalKcal = calculateGoalKcal(tdee, values.goal, values.pace);
    const macros = calculateMacros(goalKcal, weight, values.goal);
    return { bmr, tdee, macros };
  }, [age, height, values.activity, values.gender, values.goal, values.pace, weight]);

  const dateValidation = useMemo<DateValidationResult | null>(() => {
    if (values.goal === "maintain") return null;
    if (!Number.isFinite(weight) || !Number.isFinite(targetWeight) || targetWeight <= 0) return null;
    const change = Math.abs(targetWeight - weight);
    if (change === 0) return null;
    return validateTargetDate(targetDate, change, values.pace);
  }, [targetDate, targetWeight, values.goal, values.pace, weight]);

  const setValue = <K extends keyof OnboardingValues>(key: K, value: OnboardingValues[K]) => {
    setError(null);
    setValues((current) => ({ ...current, [key]: value }));
  };

  const changeNumeric = (field: NumericField, delta: number, min: number, max: number, decimals = 1) => {
    const current = parseDecimal(values[field]);
    const base = Number.isFinite(current) ? current : min;
    setValue(field, formatNumber(Math.max(min, Math.min(max, base + delta)), decimals));
  };

  const validateCurrentStep = () => {
    if (step === "weight" && (!Number.isFinite(weight) || weight < 30 || weight > 250)) return "Podaj wagę 30-250 kg.";
    if (step === "height" && (!Number.isFinite(height) || height < 130 || height > 230)) return "Podaj wzrost 130-230 cm.";
    if (step === "age" && (!Number.isFinite(age) || age < 10 || age > 100)) return "Podaj wiek 10-100 lat.";
    if (step === "target" && values.targetDate.trim() && !targetDate) return "Data musi mieć format RRRR-MM-DD.";
    if (step === "target" && values.targetWeight.trim() && (!Number.isFinite(targetWeight) || targetWeight < 30 || targetWeight > 250)) {
      return "Cel wagi musi być w zakresie 30-250 kg.";
    }
    return null;
  };

  const goNext = () => {
    const validation = validateCurrentStep();
    if (validation) {
      setError(validation);
      return;
    }

    if (isLast) {
      void finish();
      return;
    }

    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const finish = async () => {
    if (!profile || !preview) return;
    const validation = validateCurrentStep();
    if (validation) {
      setError(validation);
      return;
    }

    const savedTargetDate =
      dateValidation && targetDate
        ? dateValidation.isRealistic
          ? targetDate
          : dateValidation.realisticDate
        : targetDate;

    setSaving(true);
    setError(null);
    try {
      await saveProfile({
        ...profile,
        weightKg: weight,
        heightCm: height,
        age: Math.round(age),
        gender: values.gender,
        goalType: values.goal,
        goalPace: values.goal === "maintain" ? null : values.pace,
        activityLevel: values.activity,
        targetWeightKg: values.goal === "maintain" || !Number.isFinite(targetWeight) ? null : targetWeight,
        targetDate: values.goal === "maintain" ? null : savedTargetDate,
        goalKcal: preview.macros.kcal,
        goalProteinG: preview.macros.proteinG,
        goalCarbsG: preview.macros.carbsG,
        goalFatG: preview.macros.fatG,
        onboardingDone: true,
      });
      router.replace("/home");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nie udało się zapisać profilu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Wstecz"
          disabled={stepIndex === 0}
          onPress={() => setStepIndex((current) => Math.max(0, current - 1))}
          style={({ pressed }) => [styles.back, stepIndex === 0 && styles.hidden, pressed && styles.pressed]}
        >
          <Icon name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.progress}>
          {steps.map((item, index) => (
            <View key={item} style={[styles.dot, index <= stepIndex && styles.dotActive, index === stepIndex && styles.dotCurrent]} />
          ))}
        </View>
        <Text style={styles.stepCount}>{stepIndex + 1}/{steps.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.iconBox}>
          <Icon name={meta.icon} size={32} color={colors.accent} />
        </View>
        <Text style={styles.title}>{meta.title}</Text>
        <Text style={styles.subtitle}>{meta.subtitle}</Text>

        {step === "gender" ? (
          <View style={styles.cards}>
            <ChoiceCard label="Mężczyzna" subtitle="+5 kcal we wzorze BMR" active={values.gender === "male"} onPress={() => setValue("gender", "male")} />
            <ChoiceCard label="Kobieta" subtitle="-161 kcal we wzorze BMR" active={values.gender === "female"} onPress={() => setValue("gender", "female")} />
          </View>
        ) : null}

        {step === "weight" ? (
          <NumberStep
            value={values.weight}
            unit="kg"
            min={30}
            max={250}
            step={0.5}
            decimals={1}
            onChange={(value) => setValue("weight", value)}
            onAdjust={(delta) => changeNumeric("weight", delta, 30, 250, 1)}
          />
        ) : null}

        {step === "height" ? (
          <NumberStep
            value={values.height}
            unit="cm"
            min={130}
            max={230}
            step={1}
            decimals={0}
            onChange={(value) => setValue("height", value)}
            onAdjust={(delta) => changeNumeric("height", delta, 130, 230, 0)}
          />
        ) : null}

        {step === "age" ? (
          <NumberStep
            value={values.age}
            unit="lat"
            min={10}
            max={100}
            step={1}
            decimals={0}
            onChange={(value) => setValue("age", value)}
            onAdjust={(delta) => changeNumeric("age", delta, 10, 100, 0)}
          />
        ) : null}

        {step === "goal" ? (
          <View style={styles.cards}>
            {GOALS.map((goal) => (
              <ChoiceCard
                key={goal.id}
                icon={goal.icon}
                label={goal.label}
                subtitle={goal.subtitle}
                active={values.goal === goal.id}
                onPress={() => {
                  setValue("goal", goal.id);
                  if (goal.id === "lose" && Number.isFinite(weight)) setValue("targetWeight", formatNumber(Math.max(30, weight - 5), 1));
                  if (goal.id === "gain" && Number.isFinite(weight)) setValue("targetWeight", formatNumber(Math.min(250, weight + 5), 1));
                }}
              />
            ))}
          </View>
        ) : null}

        {step === "pace" ? (
          <View style={styles.cards}>
            {PACES.map((pace) => (
              <ChoiceCard
                key={pace.id}
                label={pace.label}
                subtitle={`${pace.subtitle} (${values.goal === "lose" ? "-" : "+"}${pace.kcal} kcal/dzień)`}
                active={values.pace === pace.id}
                onPress={() => setValue("pace", pace.id)}
              />
            ))}
          </View>
        ) : null}

        {step === "activity" ? (
          <View style={styles.cards}>
            {ACTIVITIES.map((activity) => (
              <ChoiceCard
                key={activity.id}
                label={activity.label}
                subtitle={activity.subtitle}
                active={values.activity === activity.id}
                onPress={() => setValue("activity", activity.id)}
              />
            ))}
          </View>
        ) : null}

        {step === "target" ? (
          <View style={styles.targetBox}>
            <Field label="Docelowa waga" value={values.targetWeight} unit="kg" onChangeText={(value) => setValue("targetWeight", value)} />
            <Field label="Data celu" value={values.targetDate} placeholder="RRRR-MM-DD" onChangeText={(value) => setValue("targetDate", value)} />
            {dateValidation ? (
              <View style={[styles.notice, !dateValidation.isRealistic && styles.noticeWarn]}>
                <Icon name={dateValidation.isRealistic ? "check" : "alert"} size={18} color={dateValidation.isRealistic ? colors.green : colors.danger} />
                <Text style={styles.noticeText}>
                  {dateValidation.isRealistic
                    ? `Realistyczne. Zmiana około ${dateValidation.estimatedChangeKg} kg do tej daty.`
                    : `Za ambitne. Sugerowana data: ${formatDate(dateValidation.realisticDate)}.`}
                </Text>
              </View>
            ) : (
              <Text style={styles.helper}>Możesz zostawić te pola puste. Cele dzienne i tak zostaną policzone.</Text>
            )}
          </View>
        ) : null}

        {preview ? (
          <View style={styles.preview}>
            <PreviewItem label="Kalorie" value={`${preview.macros.kcal} kcal`} />
            <PreviewItem label="Białko" value={`${preview.macros.proteinG} g`} />
            <PreviewItem label="Węgle" value={`${preview.macros.carbsG} g`} />
            <PreviewItem label="Tłuszcze" value={`${preview.macros.fatG} g`} />
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isLast ? "Zapisz cele" : "Dalej"}
          disabled={saving}
          style={({ pressed }) => [styles.cta, saving && styles.disabled, pressed && !saving && styles.pressed]}
          onPress={goNext}
        >
          <Text style={styles.ctaText}>{isLast ? (saving ? "Zapisuję..." : "Zapisz cele") : "Dalej"}</Text>
        </Pressable>
      </View>
    </View>
  );
};

function NumberStep({
  value,
  unit,
  step,
  onChange,
  onAdjust,
}: {
  value: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  decimals: number;
  onChange: (value: string) => void;
  onAdjust: (delta: number) => void;
}) {
  return (
    <View style={styles.numberWrap}>
      <View style={styles.numberRow}>
        <TextInput
          accessibilityLabel={`Wpisz wartość w ${unit}`}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={styles.numberInput}
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
      <View style={styles.adjustRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Zmniejsz" style={({ pressed }) => [styles.adjust, pressed && styles.pressed]} onPress={() => onAdjust(-step)}>
          <Icon name="minus" size={24} color={colors.text} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Zwiększ" style={({ pressed }) => [styles.adjust, styles.adjustActive, pressed && styles.pressed]} onPress={() => onAdjust(step)}>
          <Icon name="plus" size={24} color={colors.warmBlack} />
        </Pressable>
      </View>
    </View>
  );
}

function ChoiceCard({
  label,
  subtitle,
  active,
  icon,
  onPress,
}: {
  label: string;
  subtitle: string;
  active: boolean;
  icon?: IconName;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.choice, active && styles.choiceActive, pressed && styles.pressed]}
      onPress={onPress}
    >
      {icon ? (
        <View style={styles.choiceIcon}>
          <Icon name={icon} size={22} color={active ? colors.accent : colors.mutedMid} />
        </View>
      ) : null}
      <View style={styles.choiceText}>
        <Text style={styles.choiceLabel}>{label}</Text>
        <Text style={styles.choiceSubtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioDot} /> : null}</View>
    </Pressable>
  );
}

function Field({
  label,
  value,
  unit,
  placeholder,
  onChangeText,
}: {
  label: string;
  value: string;
  unit?: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? "0"}
          placeholderTextColor={colors.muted}
          keyboardType={unit ? "decimal-pad" : "numbers-and-punctuation"}
          style={styles.fieldInput}
        />
        {unit ? <Text style={styles.fieldUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.previewItem}>
      <Text style={styles.previewLabel}>{label}</Text>
      <Text style={styles.previewValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.background, flex: 1 },
  header: { alignItems: "center", flexDirection: "row", gap: 12, paddingHorizontal: 18, paddingVertical: 10 },
  back: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
  hidden: { opacity: 0 },
  progress: { flex: 1, flexDirection: "row", gap: 5, justifyContent: "center" },
  dot: { backgroundColor: colors.borderMid, borderRadius: 3, height: 5, width: 8 },
  dotActive: { backgroundColor: colors.accent },
  dotCurrent: { width: 24 },
  stepCount: { ...typography.label, color: colors.muted, textAlign: "right", width: 42 },
  content: { paddingBottom: 26, paddingHorizontal: 22, paddingTop: 18 },
  iconBox: { alignItems: "center", backgroundColor: colors.accentA, borderColor: colors.accentB, borderRadius: 18, borderWidth: 1, height: 58, justifyContent: "center", marginBottom: 14, width: 58 },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.mutedMid, marginTop: 7 },
  cards: { gap: 10, marginTop: 28 },
  choice: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1.5, flexDirection: "row", gap: 13, minHeight: 72, padding: 14 },
  choiceActive: { backgroundColor: colors.accentA, borderColor: colors.accent },
  choiceIcon: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 13, height: 42, justifyContent: "center", width: 42 },
  choiceText: { flex: 1 },
  choiceLabel: { ...typography.section, color: colors.text },
  choiceSubtitle: { ...typography.label, color: colors.mutedMid, marginTop: 2 },
  radio: { alignItems: "center", borderColor: colors.borderMid, borderRadius: 11, borderWidth: 2, height: 22, justifyContent: "center", width: 22 },
  radioActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  radioDot: { backgroundColor: colors.warmBlack, borderRadius: 4, height: 8, width: 8 },
  numberWrap: { alignItems: "center", gap: 30, marginTop: 54 },
  numberRow: { alignItems: "flex-end", flexDirection: "row", gap: 8 },
  numberInput: { ...typography.display, color: colors.text, fontSize: 72, lineHeight: 76, minWidth: 160, paddingVertical: 0, textAlign: "center" },
  unit: { ...typography.section, color: colors.mutedMid, paddingBottom: 10 },
  adjustRow: { flexDirection: "row", gap: 16 },
  adjust: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, height: 58, justifyContent: "center", width: 78 },
  adjustActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  targetBox: { gap: 14, marginTop: 28 },
  field: { gap: 8 },
  fieldLabel: { ...typography.label, color: colors.mutedMid, textTransform: "uppercase" },
  fieldInputWrap: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 15, borderWidth: 1, flexDirection: "row", minHeight: 52, paddingHorizontal: 14 },
  fieldInput: { ...typography.body, color: colors.text, flex: 1, paddingVertical: 0 },
  fieldUnit: { ...typography.label, color: colors.mutedMid },
  helper: { ...typography.body, color: colors.muted },
  notice: { alignItems: "flex-start", backgroundColor: "rgba(56,201,124,0.12)", borderColor: "rgba(56,201,124,0.28)", borderRadius: 15, borderWidth: 1, flexDirection: "row", gap: 10, padding: 12 },
  noticeWarn: { backgroundColor: "rgba(255,79,107,0.12)", borderColor: "rgba(255,79,107,0.28)" },
  noticeText: { ...typography.label, color: colors.text, flex: 1 },
  preview: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 26, padding: 12 },
  previewItem: { backgroundColor: colors.card, borderRadius: 13, flexBasis: "48%", flexGrow: 1, padding: 12 },
  previewLabel: { ...typography.label, color: colors.muted },
  previewValue: { ...typography.section, color: colors.text, marginTop: 2 },
  footer: { gap: 10, paddingHorizontal: 22, paddingTop: 12 },
  cta: { alignItems: "center", backgroundColor: colors.accent, borderRadius: 15, height: 54, justifyContent: "center" },
  ctaText: { ...typography.button, color: colors.warmBlack },
  error: { ...typography.label, color: colors.danger },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.96 }] },
});
