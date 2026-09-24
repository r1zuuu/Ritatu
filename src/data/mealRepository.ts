import AsyncStorage from "@react-native-async-storage/async-storage";
import { toDateKey } from "../core/date";
import { summarizeMeals } from "../core/macroCalculator";
import type { MealEntry, MealMacros } from "./types";

const cacheKey = (uid: string, date: Date) => `ritatu:meals:${uid}:${toDateKey(date)}`;

export const parseMeals = (val: string | null): MealEntry[] => {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val) as Array<Omit<MealEntry, "timestamp"> & { timestamp: string }>;
    return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return [];
  }
};

export const getCachedMealsForDay = async (uid: string, date: Date): Promise<MealEntry[]> =>
  parseMeals(await AsyncStorage.getItem(cacheKey(uid, date)));

export const cacheMealsForDay = async (uid: string, date: Date, meals: MealEntry[]): Promise<void> => {
  await AsyncStorage.setItem(cacheKey(uid, date), JSON.stringify(meals));
};

export const getMealsForDay = async (uid: string, date: Date): Promise<MealEntry[]> =>
  getCachedMealsForDay(uid, date);

export const addMeal = async (meal: Omit<MealEntry, "id">): Promise<string> => {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const entry: MealEntry = { ...meal, id };
  const existing = await getCachedMealsForDay(meal.userId, meal.timestamp);
  await cacheMealsForDay(meal.userId, meal.timestamp, [entry, ...existing]);
  return id;
};


export type DayTotals = MealMacros & { dateKey: string; mealCount: number };

// Totals for many days in one storage round trip (week view, calendar, streak).
export const getDayTotals = async (uid: string, dates: Date[]): Promise<DayTotals[]> => {
  const entries = await AsyncStorage.multiGet(dates.map((date) => cacheKey(uid, date)));
  return entries.map(([, value], index) => {
    const meals = parseMeals(value);
    return { dateKey: toDateKey(dates[index]), mealCount: meals.length, ...summarizeMeals(meals) };
  });
};
