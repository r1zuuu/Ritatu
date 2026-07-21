import AsyncStorage from "@react-native-async-storage/async-storage";
import { toDateKey } from "../core/date";
import type { MealEntry } from "./types";

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

export const watchMealsForDay = (
  uid: string,
  date: Date,
  onChange: (meals: MealEntry[]) => void,
  onError: (error: Error) => void,
): (() => void) => {
  getCachedMealsForDay(uid, date).then(onChange).catch(onError);
  return () => {};
};
