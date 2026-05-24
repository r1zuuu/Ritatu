import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { calculateBMR, calculateGoalKcal, calculateMacros, calculateTDEE } from "../core/macroCalculator";
import type { GoalType } from "../data/types";
import { useUserProfile } from "../providers/UserProfileProvider";
import { colors } from "../theme/colors";
import { Icon, type IconName } from "../components/Icon";

const STEPS = [
  { field: "weight", title: "Ile ważysz?", sub: "Podaj swoją aktualną wagę", unit: "kg", min: 30, max: 250, step: 0.5, icon: "weight" },
  { field: "height", title: "Jaki masz wzrost?", sub: "Potrzebujemy tego do obliczenia Twojego BMI", unit: "cm", min: 130, max: 230, step: 1, icon: "activity" },
  { field: "age", title: "Ile masz lat?", sub: "Wiek wpływa na Twoje zapotrzebowanie", unit: "lat", min: 10, max: 100, step: 1, icon: "gauge" },
  { field: "goal", title: "Jaki jest Twój cel?", sub: "Dopasujemy Twój plan na tej podstawie", icon: "sparkles" },
] as const;

const GOALS = [
  { id: "lose", label: "Schudnę", sub: "Deficyt kaloryczny", icon: "activity" },
  { id: "maintain", label: "Utrzymam wagę", sub: "Bilans kaloryczny", icon: "gauge" },
  { id: "gain", label: "Przytyję", sub: "Nadwyżka kaloryczna", icon: "dumbbell" },
] as const;

type Vals = { weight: number; height: number; age: number; goal: GoalType };
type NumericField = "weight" | "height" | "age";

const parseDecimal = (value: string) => Number(value.replace(",", "."));
const formatNumeric = (value: number, decimals = 1) => {
  const rounded = Number(value.toFixed(decimals));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

export const OnboardingScreen = () => {
  const { profile, saveProfile } = useUserProfile();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [vals, setVals] = useState<Vals>({ weight: 83.0, height: 178, age: 25, goal: "maintain" });
  const [numberInputs, setNumberInputs] = useState<Record<NumericField, string>>({
    weight: "83",
    height: "178",
    age: "25",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isGoal = cur.field === "goal";

  const adj = (delta: number) => {
    if (isGoal) return;
    const s = cur as typeof STEPS[0];
    const field = s.field as NumericField;
    const current = parseDecimal(numberInputs[field]);
    const base = Number.isFinite(current) ? current : vals[field];
    const next = Math.min(s.max, Math.max(s.min, base + delta));
    const normalized = formatNumeric(next, s.step < 1 ? 1 : 0);
    setVals(v => ({ ...v, [field]: Number(normalized) }));
    setNumberInputs(v => ({ ...v, [field]: normalized }));
  };

  const displayVal = isGoal ? null : (vals[cur.field as keyof Vals] as number);
  const currentNumericStep = isGoal ? null : (cur as typeof STEPS[0]);
  const currentField = currentNumericStep?.field as NumericField | undefined;

  const updateNumberInput = (text: string) => {
    if (!currentNumericStep || !currentField) return;
    setNumberInputs(v => ({ ...v, [currentField]: text }));
    const parsed = parseDecimal(text);
    if (!Number.isFinite(parsed)) return;
    const bounded = Math.min(currentNumericStep.max, Math.max(currentNumericStep.min, parsed));
    setVals(v => ({ ...v, [currentField]: bounded }));
  };

  const normalizeNumberInput = () => {
    if (!currentNumericStep || !currentField) return;
    const parsed = parseDecimal(numberInputs[currentField]);
    const base = Number.isFinite(parsed) ? parsed : vals[currentField];
    const bounded = Math.min(currentNumericStep.max, Math.max(currentNumericStep.min, base));
    const normalized = formatNumeric(bounded, currentNumericStep.step < 1 ? 1 : 0);
    setVals(v => ({ ...v, [currentField]: Number(normalized) }));
    setNumberInputs(v => ({ ...v, [currentField]: normalized }));
  };

  const finish = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const bmr = calculateBMR(vals.weight, vals.height, vals.age, "male");
      const tdee = calculateTDEE(bmr, "moderate");
      const goalKcal = calculateGoalKcal(tdee, vals.goal, "moderate");
      const macros = calculateMacros(goalKcal, vals.weight, vals.goal);
      await saveProfile({
        ...profile,
        weightKg: vals.weight,
        heightCm: vals.height,
        age: Math.round(vals.age),
        gender: "male",
        goalType: vals.goal,
        goalPace: "moderate",
        activityLevel: "moderate",
        targetWeightKg: null,
        targetDate: null,
        goalKcal: macros.kcal,
        goalProteinG: macros.proteinG,
        goalCarbsG: macros.carbsG,
        goalFatG: macros.fatG,
        onboardingDone: true,
      });
      router.replace("/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się zapisać.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      {/* Progress header */}
      <View style={styles.header}>
        {step > 0 ? (
          <TouchableOpacity onPress={() => setStep(s => s - 1)} style={styles.back}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 30 }} />
        )}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i <= step && styles.dotActive, i === step && styles.dotCurrent]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>{step + 1}/{STEPS.length}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.icon}>
          <Icon name={cur.icon as IconName} size={34} color={colors.accent} />
        </View>
        <Text style={styles.title}>{cur.title}</Text>
        <Text style={styles.sub}>{cur.sub}</Text>

        {!isGoal ? (
          <View style={styles.stepper}>
            <View style={styles.valuRow}>
              <TextInput
                style={styles.bigInput}
                value={currentField ? numberInputs[currentField] : String(displayVal ?? "")}
                onChangeText={updateNumberInput}
                onBlur={normalizeNumberInput}
                keyboardType="decimal-pad"
                selectTextOnFocus
                accessibilityLabel={`${(cur as typeof STEPS[0]).title}, wpisz liczbe`}
              />
              <Text style={styles.unit}>{(cur as typeof STEPS[0]).unit}</Text>
            </View>
            <View style={styles.btnsRow}>
              <TouchableOpacity style={styles.btnMinus} onPress={() => adj(-(cur as typeof STEPS[0]).step)} activeOpacity={0.7}>
                <Text style={styles.btnMinusText}>−</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.btnPlus} onPress={() => adj((cur as typeof STEPS[0]).step)} activeOpacity={0.7}>
                <Text style={styles.btnPlusText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.goalList}>
            {GOALS.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[styles.goalCard, vals.goal === g.id && styles.goalCardActive]}
                onPress={() => setVals(v => ({ ...v, goal: g.id }))}
                activeOpacity={0.8}
              >
                <View style={styles.goalIcon}>
                  <Icon name={g.icon as IconName} size={24} color={vals.goal === g.id ? colors.accent : colors.mutedMid} />
                </View>
                <View style={styles.goalText}>
                  <Text style={styles.goalLabel}>{g.label}</Text>
                  <Text style={styles.goalSub}>{g.sub}</Text>
                </View>
                <View style={[styles.radio, vals.goal === g.id && styles.radioActive]}>
                  {vals.goal === g.id && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Bottom */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity
          style={styles.cta}
          onPress={() => isLast ? void finish() : setStep(s => s + 1)}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>{isLast ? (saving ? "Zapisuję..." : "Zaczynamy") : "Dalej"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  back: {
    width: 30,
    alignItems: "flex-start",
  },
  backArrow: {
    color: colors.mutedMid,
    fontSize: 28,
    lineHeight: 30,
  },
  dots: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    height: 5,
    width: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
  dotCurrent: {
    width: 22,
  },
  stepLabel: {
    color: colors.muted,
    fontSize: 11,
    width: 30,
    textAlign: "right",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  icon: {
    alignItems: "center",
    backgroundColor: colors.accentA,
    borderColor: colors.accentB,
    borderRadius: 18,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    marginBottom: 14,
    width: 56,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 6,
    lineHeight: 32,
  },
  sub: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 36,
  },
  stepper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
  },
  valuRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  bigInput: {
    color: colors.text,
    fontSize: 72,
    fontWeight: "800",
    letterSpacing: -2,
    lineHeight: 76,
    minWidth: 140,
    maxWidth: 240,
    textAlign: "center",
    paddingVertical: 0,
  },
  unit: {
    color: colors.muted,
    fontSize: 22,
    fontWeight: "500",
    paddingBottom: 8,
  },
  btnsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  btnMinus: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  btnMinusText: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "300",
  },
  divider: {
    width: 1,
    height: 60,
    backgroundColor: colors.border,
  },
  btnPlus: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPlusText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "400",
  },
  goalList: {
    flex: 1,
    gap: 10,
    justifyContent: "center",
  },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  goalCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentA,
  },
  goalIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  goalText: {
    flex: 1,
  },
  goalLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  goalSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  radioDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  bottom: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 8,
  },
  cta: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
  },
});
