import type {
  ActivityLevel,
  DateValidationResult,
  Gender,
  GoalPace,
  GoalType,
  MacroGoals,
  MealMacros,
} from "../data/types";

const paceKcal: Record<GoalPace, number> = {
  slow: 275,
  moderate: 550,
  fast: 825,
};

const activityMultiplier: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

export const round = (value: number, places = 0) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

export const calculateKcal = (proteinG: number, carbsG: number, fatG: number) =>
  proteinG * 4 + carbsG * 4 + fatG * 9;

export const calculateMealMacros = (
  per100g: { proteinPer100g: number; carbsPer100g: number; fatPer100g: number },
  weightG: number,
): MealMacros => {
  const factor = weightG / 100;
  const proteinG = per100g.proteinPer100g * factor;
  const carbsG = per100g.carbsPer100g * factor;
  const fatG = per100g.fatPer100g * factor;

  return {
    kcal: calculateKcal(proteinG, carbsG, fatG),
    proteinG,
    carbsG,
    fatG,
  };
};

// Total (per-porcja) makra + realna waga → per-100g, jak trzyma je MealEntry.
// Guard: przy zerowej wadze zwraca zera z waga 100, zeby nie dzielic przez 0.
export const totalsToPer100g = (
  totalWeightG: number,
  proteinG: number,
  carbsG: number,
  fatG: number,
) => {
  const factor = totalWeightG > 0 ? totalWeightG / 100 : 1;
  return {
    weightG: totalWeightG > 0 ? totalWeightG : 100,
    proteinPer100g: proteinG / factor,
    carbsPer100g: carbsG / factor,
    fatPer100g: fatG / factor,
  };
};

export const calculateBMR = (
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender,
) => {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === "male" ? base + 5 : base - 161;
};

export const calculateTDEE = (bmr: number, activityLevel: ActivityLevel) =>
  bmr * activityMultiplier[activityLevel];

export const calculateGoalKcal = (
  tdee: number,
  goalType: GoalType,
  goalPace: GoalPace,
) => {
  if (goalType === "maintain") return tdee;
  const modifier = paceKcal[goalPace];
  return goalType === "lose" ? tdee - modifier : tdee + modifier;
};

export const calculateMacros = (
  goalKcal: number,
  weightKg: number,
  goalType: GoalType,
): MacroGoals => {
  const proteinG = (goalType === "maintain" ? 1.6 : 2.0) * weightKg;
  const fatKcal = goalKcal * 0.25;
  const fatG = fatKcal / 9;
  const carbsKcal = Math.max(goalKcal - proteinG * 4 - fatKcal, 0);
  const carbsG = carbsKcal / 4;

  return {
    kcal: round(goalKcal),
    proteinG: round(proteinG),
    carbsG: round(carbsG),
    fatG: round(fatG),
  };
};

export const validateTargetDate = (
  targetDate: Date | null,
  weightChangeKg: number,
  goalPace: GoalPace,
  now = new Date(),
): DateValidationResult => {
  const dailyKcal = paceKcal[goalPace];
  const weeklyChangeKg = (dailyKcal * 7) / 7700;
  const neededWeeks = Math.max(Math.ceil(Math.abs(weightChangeKg) / weeklyChangeKg), 4);
  const realisticDate = new Date(now);
  realisticDate.setDate(realisticDate.getDate() + neededWeeks * 7);

  const fourWeeksFromNow = new Date(now);
  fourWeeksFromNow.setDate(fourWeeksFromNow.getDate() + 28);

  const selected = targetDate ?? realisticDate;
  const minAllowed = realisticDate > fourWeeksFromNow ? realisticDate : fourWeeksFromNow;
  const diffDays = Math.max(
    Math.ceil((selected.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    0,
  );

  return {
    isRealistic: selected >= minAllowed,
    realisticDate: minAllowed,
    estimatedChangeKg: round((dailyKcal * diffDays) / 7700, 1),
  };
};

export const summarizeMeals = (meals: Array<{
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  weightG: number;
}>) =>
  meals.reduce(
    (totals, meal) => {
      const macros = calculateMealMacros(meal, meal.weightG);
      return {
        kcal: totals.kcal + macros.kcal,
        proteinG: totals.proteinG + macros.proteinG,
        carbsG: totals.carbsG + macros.carbsG,
        fatG: totals.fatG + macros.fatG,
      };
    },
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
