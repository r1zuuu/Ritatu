import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { Icon, type IconName } from "../components/Icon";
import { addDays } from "../core/date";
import {
  calculateBMR,
  calculateGoalKcal,
  calculateMacros,
  calculateTDEE,
  validateTargetDate,
} from "../core/macroCalculator";
import { formatDecimal, parseDecimal } from "../core/numberFormat";
import type { ActivityLevel, DateValidationResult, Gender, GoalPace, GoalType, UserProfile } from "../data/types";
import { useUserProfile } from "../providers/UserProfileProvider";
import { colors } from "../theme/colors";
import { radius } from "../theme/layout";
import { typography } from "../theme/typography";

type StepKey = "gender" | "weight" | "height" | "age" | "goal" | "pace" | "activity" | "target";
type NumericField = "weight" | "height" | "age";

type OnboardingValues = {
  gender: Gender;
  weight: string;
  height: string;
  age: string;
  goal: GoalType;
  pace: GoalPace;
  activity: ActivityLevel;
  targetWeight: string;
  targetMonths: number | null;
};

const BASE_STEPS: StepKey[] = ["gender", "weight", "height", "age", "goal", "pace", "activity", "target"];

const STEP_META: Record<StepKey, { title: string; subtitle: string; icon: IconName }> = {
  gender: { title: "Twoja płeć", subtitle: "Potrzebujemy jej, żeby dobrze policzyć Twoje dzienne zapotrzebowanie.", icon: "person" },
  weight: { title: "Ile ważysz?", subtitle: "Od aktualnej wagi zależą kalorie i ilość białka.", icon: "weight" },
  height: { title: "Jaki masz wzrost?", subtitle: "Wzrost wpływa na to, ile energii spalasz w spoczynku.", icon: "bar-chart" },
  age: { title: "Ile masz lat?", subtitle: "Z wiekiem zapotrzebowanie lekko spada.", icon: "calendar" },
  goal: { title: "Jaki masz cel?", subtitle: "Od tego zależy, czy jesz mniej, tyle samo, czy więcej niż spalasz.", icon: "sparkles" },
  pace: { title: "W jakim tempie?", subtitle: "Wolniejsze tempo łatwiej utrzymać na dłużej.", icon: "gauge" },
  activity: { title: "Jak dużo się ruszasz?", subtitle: "Licz treningi i codzienny ruch, np. pracę na nogach.", icon: "dumbbell" },
  target: { title: "Waga docelowa", subtitle: "Opcjonalnie. Sprawdzimy, czy termin jest realny przy wybranym tempie.", icon: "check" },
};

const GOALS: Array<{ id: GoalType; label: string; subtitle: string; icon: IconName }> = [
  { id: "lose", label: "Schudnąć", subtitle: "Jesz trochę mniej, niż spalasz", icon: "activity" },
  { id: "maintain", label: "Utrzymać wagę", subtitle: "Jesz tyle, ile spalasz", icon: "gauge" },
  { id: "gain", label: "Przytyć / budować masę", subtitle: "Jesz trochę więcej, niż spalasz", icon: "dumbbell" },
];

const PACES: Array<{ id: GoalPace; label: string; subtitle: string; kcal: number }> = [
  { id: "slow", label: "Spokojne", subtitle: "około 0,25 kg na tydzień", kcal: 275 },
  { id: "moderate", label: "Umiarkowane", subtitle: "około 0,5 kg na tydzień", kcal: 550 },
  { id: "fast", label: "Szybkie", subtitle: "około 0,75 kg na tydzień", kcal: 825 },
];

const ACTIVITIES: Array<{ id: ActivityLevel; label: string; subtitle: string }> = [
  { id: "sedentary", label: "Mało", subtitle: "Praca przy biurku, mało ruchu" },
  { id: "light", label: "Lekko", subtitle: "Spacery, 1–2 treningi w tygodniu" },
  { id: "moderate", label: "Średnio", subtitle: "3–4 treningi w tygodniu" },
  { id: "active", label: "Dużo", subtitle: "5+ treningów albo praca fizyczna" },
];

const TARGET_MONTHS = [3, 6, 12];

// Where the steppers start when a field is empty; also shown as placeholders.
const DEFAULTS: Record<NumericField, number> = { weight: 70, height: 170, age: 30 };
const RANGES: Record<NumericField, [number, number]> = { weight: [30, 250], height: [130, 230], age: [10, 100] };

const inRange = (field: NumericField, value: number) =>
  Number.isFinite(value) && value >= RANGES[field][0] && value <= RANGES[field][1];

const formatLongDate = (date: Date) =>
  new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" }).format(date);

function profileToValues(profile: UserProfile | null): OnboardingValues {
  const months = profile?.targetDate
    ? Math.round((profile.targetDate.getTime() - Date.now()) / (30.4 * 86_400_000))
    : null;
  return {
    gender: profile?.gender ?? "male",
    weight: profile?.weightKg != null ? String(profile.weightKg) : "",
    height: profile?.heightCm != null ? String(profile.heightCm) : "",
    age: profile?.age != null ? String(profile.age) : "",
    goal: profile?.goalType ?? "lose",
    pace: profile?.goalPace ?? "moderate",
    activity: profile?.activityLevel ?? "moderate",
    targetWeight: profile?.targetWeightKg != null ? String(profile.targetWeightKg) : "",
    targetMonths: months && TARGET_MONTHS.includes(months) ? months : null,
  };
}

export const OnboardingScreen = () => {
  const insets = useSafeAreaInsets();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const editing = edit === "1";
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
  const targetDate = values.targetMonths ? addDays(new Date(), Math.round(values.targetMonths * 30.4)) : null;

  // Only once the body data is plausible: with empty fields the formula
  // produced negative calories on the very first screen.
  const preview = useMemo(() => {
    if (!inRange("weight", weight) || !inRange("height", height) || !inRange("age", age)) return null;
    const bmr = calculateBMR(weight, height, age, values.gender);
    const tdee = calculateTDEE(bmr, values.activity);
    const goalKcal = calculateGoalKcal(tdee, values.goal, values.pace);
    return calculateMacros(goalKcal, weight, values.goal);
  }, [age, height, values.activity, values.gender, values.goal, values.pace, weight]);

  const dateValidation = useMemo<DateValidationResult | null>(() => {
    if (values.goal === "maintain" || !targetDate) return null;
    if (!inRange("weight", weight) || !Number.isFinite(targetWeight)) return null;
    const change = Math.abs(targetWeight - weight);
    if (change === 0) return null;
    return validateTargetDate(targetDate, change, values.pace);
  }, [targetDate?.getTime(), targetWeight, values.goal, values.pace, weight]);

  const goBack = () => {
    if (stepIndex > 0) {
      setError(null);
      setStepIndex((current) => current - 1);
      return true;
    }
    if (editing) {
      router.back();
      return true;
    }
    return false;
  };

  // Android back steps through onboarding instead of leaving it.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", goBack);
    return () => sub.remove();
  });

  const setValue = <K extends keyof OnboardingValues>(key: K, value: OnboardingValues[K]) => {
    setError(null);
    setValues((current) => ({ ...current, [key]: value }));
  };

  const changeNumeric = (field: NumericField, delta: number, decimals: number) => {
    const current = parseDecimal(values[field]);
    const base = Number.isFinite(current) ? current : DEFAULTS[field];
    const [min, max] = RANGES[field];
    setValue(field, formatDecimal(Math.max(min, Math.min(max, base + delta)), decimals));
  };

  const validateCurrentStep = () => {
    if (step === "weight" && !inRange("weight", weight)) return "Podaj wagę od 30 do 250 kg.";
    if (step === "height" && !inRange("height", height)) return "Podaj wzrost od 130 do 230 cm.";
    if (step === "age" && !inRange("age", age)) return "Podaj wiek od 10 do 100 lat.";
    if (step === "target" && values.targetWeight.trim()) {
      if (!Number.isFinite(targetWeight) || targetWeight < 30 || targetWeight > 250) return "Waga docelowa musi być od 30 do 250 kg.";
      if (values.goal === "lose" && targetWeight >= weight) return "Przy chudnięciu waga docelowa musi być niższa od obecnej.";
      if (values.goal === "gain" && targetWeight <= weight) return "Przy budowaniu masy waga docelowa musi być wyższa od obecnej.";
    }
    return null;
  };

  const goNext = () => {
    // An empty number step shows its default as a placeholder; "Dalej" accepts
    // it instead of erroring on a value the user can see.
    if ((step === "weight" || step === "height" || step === "age") && !values[step].trim()) {
      setValue(step, String(DEFAULTS[step]));
      setStepIndex((current) => Math.min(current + 1, steps.length - 1));
      return;
    }
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
        targetDate: values.goal === "maintain" ? null : targetDate,
        goalKcal: preview.kcal,
        goalProteinG: preview.proteinG,
        goalCarbsG: preview.carbsG,
        goalFatG: preview.fatG,
        onboardingDone: true,
      });
      if (editing) router.back();
      else router.replace("/home");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nie udało się zapisać profilu.");
    } finally {
      setSaving(false);
    }
  };

  const numberStep = (field: NumericField, unit: string, stepSize: number, decimals: number) => (
    <NumberStep
      value={values[field]}
      placeholder={String(DEFAULTS[field])}
      unit={unit}
      onChange={(value) => setValue(field, value)}
      onAdjust={(delta) => changeNumeric(field, delta, decimals)}
      step={stepSize}
    />
  );

  return (
    <KeyboardAvoidingView
      style={[styles.wrap, { paddingTop: insets.top + 10 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={stepIndex === 0 && editing ? "Anuluj" : "Wstecz"}
          disabled={stepIndex === 0 && !editing}
          onPress={goBack}
          style={({ pressed }) => [styles.back, stepIndex === 0 && !editing && styles.hidden, pressed && styles.pressed]}
        >
          <Icon name={stepIndex === 0 && editing ? "x" : "chevron-left"} size={22} color={colors.text} />
        </Pressable>
        <View style={styles.progress}>
          {steps.map((item, index) => (
            <View key={item} style={[styles.dot, index <= stepIndex && styles.dotActive, index === stepIndex && styles.dotCurrent]} />
          ))}
        </View>
        <Text style={styles.stepCount}>{stepIndex + 1}/{steps.length}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.iconBox}>
          <Icon name={meta.icon} size={30} color={colors.accent} />
        </View>
        <Text style={styles.title}>{meta.title}</Text>
        <Text style={styles.subtitle}>{meta.subtitle}</Text>

        {step === "gender" ? (
          <View style={styles.cards}>
            <ChoiceCard label="Mężczyzna" active={values.gender === "male"} onPress={() => setValue("gender", "male")} />
            <ChoiceCard label="Kobieta" active={values.gender === "female"} onPress={() => setValue("gender", "female")} />
          </View>
        ) : null}

        {step === "weight" ? numberStep("weight", "kg", 0.5, 1) : null}
        {step === "height" ? numberStep("height", "cm", 1, 0) : null}
        {step === "age" ? numberStep("age", "lat", 1, 0) : null}

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
                  // Suggest a target only when none was typed yet.
                  if (!values.targetWeight.trim() && inRange("weight", weight)) {
                    if (goal.id === "lose") setValue("targetWeight", formatDecimal(Math.max(30, weight - 5), 1));
                    if (goal.id === "gain") setValue("targetWeight", formatDecimal(Math.min(250, weight + 5), 1));
                  }
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
                subtitle={`${pace.subtitle} (${values.goal === "lose" ? "−" : "+"}${pace.kcal} kcal dziennie)`}
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
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Waga docelowa</Text>
              <View style={styles.fieldInputWrap}>
                <TextInput
                  accessibilityLabel="Waga docelowa w kg"
                  value={values.targetWeight}
                  onChangeText={(value) => setValue("targetWeight", value)}
                  placeholder="np. 75"
                  placeholderTextColor={colors.muted}
                  keyboardType="decimal-pad"
                  style={styles.fieldInput}
                />
                <Text style={styles.fieldUnit}>kg</Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>W jakim czasie?</Text>
              <View style={styles.chips}>
                {[...TARGET_MONTHS, null].map((months) => {
                  const active = values.targetMonths === months;
                  return (
                    <Pressable
                      key={String(months)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressedLight]}
                      onPress={() => setValue("targetMonths", months)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {months === null ? "Bez terminu" : months === 12 ? "Rok" : `${months} mies.`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {dateValidation ? (
              <View style={[styles.notice, !dateValidation.isRealistic && styles.noticeWarn]}>
                <Icon name={dateValidation.isRealistic ? "check" : "alert"} size={18} color={dateValidation.isRealistic ? colors.green : colors.danger} />
                <Text style={styles.noticeText}>
                  {dateValidation.isRealistic
                    ? `Realny plan: około ${dateValidation.estimatedChangeKg} kg zmiany do ${formatLongDate(targetDate!)}.`
                    : `Przy tym tempie to za mało czasu. Realnie cel osiągniesz około ${formatLongDate(dateValidation.realisticDate)}.`}
                </Text>
              </View>
            ) : (
              <Text style={styles.helper}>Możesz to pominąć. Cele dzienne i tak zostaną policzone.</Text>
            )}
          </View>
        ) : null}

        {preview ? (
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>{isLast ? "Twój plan dzienny" : "Na razie wychodzi"}</Text>
            <View style={styles.previewGrid}>
              <PreviewItem label="Kalorie" value={`${preview.kcal} kcal`} accent />
              <PreviewItem label="Białko" value={`${preview.proteinG} g`} />
              <PreviewItem label="Węglowodany" value={`${preview.carbsG} g`} />
              <PreviewItem label="Tłuszcze" value={`${preview.fatG} g`} />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title={isLast ? (saving ? "Zapisuję..." : editing ? "Zapisz zmiany" : "Zaczynamy") : "Dalej"}
          icon={isLast ? "check" : undefined}
          disabled={saving}
          onPress={goNext}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

function NumberStep({
  value,
  placeholder,
  unit,
  step,
  onChange,
  onAdjust,
}: {
  value: string;
  placeholder: string;
  unit: string;
  step: number;
  onChange: (value: string) => void;
  onAdjust: (delta: number) => void;
}) {
  return (
    <View style={styles.numberWrap}>
      <View style={styles.numberRow}>
        <TextInput
          accessibilityLabel={`Wartość w ${unit}`}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
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
  subtitle?: string;
  active: boolean;
  icon?: IconName;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      style={({ pressed }) => [styles.choice, active && styles.choiceActive, pressed && styles.pressedLight]}
      onPress={onPress}
    >
      {icon ? (
        <View style={styles.choiceIcon}>
          <Icon name={icon} size={22} color={active ? colors.accent : colors.mutedMid} />
        </View>
      ) : null}
      <View style={styles.choiceText}>
        <Text style={styles.choiceLabel}>{label}</Text>
        {subtitle ? <Text style={styles.choiceSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioDot} /> : null}</View>
    </Pressable>
  );
}

function PreviewItem({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.previewItem}>
      <Text style={styles.previewLabel}>{label}</Text>
      <Text style={[styles.previewValue, accent && { color: colors.accent }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.background, flex: 1 },
  header: { alignItems: "center", flexDirection: "row", gap: 12, paddingHorizontal: 18, paddingVertical: 10 },
  back: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.control, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  hidden: { opacity: 0 },
  progress: { flex: 1, flexDirection: "row", gap: 5, justifyContent: "center" },
  dot: { backgroundColor: colors.borderMid, borderRadius: 3, height: 5, width: 8 },
  dotActive: { backgroundColor: colors.accent },
  dotCurrent: { width: 24 },
  stepCount: { ...typography.label, color: colors.mutedMid, textAlign: "right", width: 44 },
  content: { paddingBottom: 26, paddingHorizontal: 22, paddingTop: 18 },
  iconBox: { alignItems: "center", backgroundColor: colors.accentA, borderColor: colors.accentB, borderRadius: radius.lg, borderWidth: 1, height: 58, justifyContent: "center", marginBottom: 14, width: 58 },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.mutedMid, marginTop: 7 },
  cards: { gap: 10, marginTop: 28 },
  choice: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1.5, flexDirection: "row", gap: 13, minHeight: 68, padding: 14 },
  choiceActive: { backgroundColor: colors.accentA, borderColor: colors.accent },
  choiceIcon: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.control, height: 42, justifyContent: "center", width: 42 },
  choiceText: { flex: 1 },
  choiceLabel: { ...typography.section, color: colors.text, fontSize: 17 },
  choiceSubtitle: { ...typography.caption, color: colors.mutedMid, marginTop: 2 },
  radio: { alignItems: "center", borderColor: colors.borderMid, borderRadius: 11, borderWidth: 2, height: 22, justifyContent: "center", width: 22 },
  radioActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  radioDot: { backgroundColor: colors.warmBlack, borderRadius: 4, height: 8, width: 8 },
  numberWrap: { alignItems: "center", gap: 30, marginTop: 48 },
  numberRow: { alignItems: "flex-end", flexDirection: "row", gap: 8 },
  numberInput: { ...typography.display, color: colors.text, fontSize: 72, lineHeight: 80, paddingVertical: 0, textAlign: "center", width: 170 },
  unit: { ...typography.section, color: colors.mutedMid, paddingBottom: 12 },
  adjustRow: { flexDirection: "row", gap: 16 },
  adjust: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, height: 58, justifyContent: "center", width: 78 },
  adjustActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  targetBox: { gap: 18, marginTop: 28 },
  field: { gap: 8 },
  fieldLabel: { ...typography.label, color: colors.mutedMid },
  fieldInputWrap: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.control, borderWidth: 1, flexDirection: "row", minHeight: 52, paddingHorizontal: 14 },
  fieldInput: { ...typography.body, color: colors.text, flex: 1, minWidth: 0, paddingVertical: 0 },
  fieldUnit: { ...typography.label, color: colors.mutedMid },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderColor: colors.borderMid, borderRadius: radius.pill, borderWidth: 1, justifyContent: "center", minHeight: 40, paddingHorizontal: 14 },
  chipActive: { backgroundColor: colors.accentA, borderColor: colors.accent },
  chipText: { ...typography.label, color: colors.mutedMid, fontSize: 13 },
  chipTextActive: { color: colors.accent },
  helper: { ...typography.caption, color: colors.mutedMid },
  notice: { alignItems: "flex-start", backgroundColor: colors.greenA, borderRadius: radius.control, flexDirection: "row", gap: 10, padding: 12 },
  noticeWarn: { backgroundColor: colors.dangerA },
  noticeText: { ...typography.caption, color: colors.text, flex: 1 },
  preview: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: 10, marginTop: 26, padding: 14 },
  previewTitle: { ...typography.stat, color: colors.mutedMid },
  previewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  previewItem: { backgroundColor: colors.card, borderRadius: radius.control, flexBasis: "48%", flexGrow: 1, padding: 12 },
  previewLabel: { ...typography.micro, color: colors.mutedMid },
  previewValue: { ...typography.section, color: colors.text, fontVariant: ["tabular-nums"], marginTop: 2 },
  footer: { gap: 10, paddingHorizontal: 22, paddingTop: 12 },
  error: { ...typography.caption, color: colors.danger },
  pressed: { opacity: 0.86, transform: [{ scale: 0.96 }] },
  pressedLight: { opacity: 0.8 },
});
