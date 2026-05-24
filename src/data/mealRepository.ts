import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { endOfDay, startOfDay, toDateKey } from "../core/date";
import { db } from "../services/firebase";
import { mealFromDoc, mealToDoc } from "./serializers";
import type { MealEntry, MealEntryDocument } from "./types";

const ensureDb = () => {
  if (!db) throw new Error("Firebase nie jest skonfigurowany.");
  return db;
};

const cacheKey = (uid: string, date: Date) => `ritatu:meals:${uid}:${toDateKey(date)}`;

const parseCachedMeals = (value: string | null): MealEntry[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as Array<Omit<MealEntry, "timestamp"> & { timestamp: string }>;
    return parsed.map((meal) => ({ ...meal, timestamp: new Date(meal.timestamp) }));
  } catch {
    return [];
  }
};

export const cacheMealsForDay = async (uid: string, date: Date, meals: MealEntry[]) => {
  await AsyncStorage.setItem(cacheKey(uid, date), JSON.stringify(meals));
};

export const getCachedMealsForDay = async (uid: string, date: Date) =>
  parseCachedMeals(await AsyncStorage.getItem(cacheKey(uid, date)));

const dayQuery = (uid: string, date: Date) =>
  query(
    collection(ensureDb(), "meals"),
    where("userId", "==", uid),
    where("timestamp", ">=", Timestamp.fromDate(startOfDay(date))),
    where("timestamp", "<", Timestamp.fromDate(endOfDay(date))),
    orderBy("timestamp", "desc"),
  );

export const addMeal = async (meal: Omit<MealEntry, "id">) => {
  const ref = doc(collection(ensureDb(), "meals"));
  await setDoc(ref, mealToDoc({ ...meal, id: ref.id }));
  return ref.id;
};

export const getMealsForDay = async (uid: string, date: Date) => {
  const snapshot = await getDocs(dayQuery(uid, date));
  const meals = snapshot.docs.map((mealDoc) =>
    mealFromDoc({ ...(mealDoc.data() as MealEntryDocument), id: mealDoc.id }),
  );
  await cacheMealsForDay(uid, date, meals);
  return meals;
};

export const watchMealsForDay = (
  uid: string,
  date: Date,
  onChange: (meals: MealEntry[]) => void,
  onError: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    dayQuery(uid, date),
    async (snapshot) => {
      const meals = snapshot.docs.map((mealDoc) =>
        mealFromDoc({ ...(mealDoc.data() as MealEntryDocument), id: mealDoc.id }),
      );
      await cacheMealsForDay(uid, date, meals);
      onChange(meals);
    },
    onError,
  );
