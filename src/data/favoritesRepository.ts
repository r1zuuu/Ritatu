import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { calculateMealMacros } from "../core/macroCalculator";
import { normalize } from "../core/search";
import type { FoodItem } from "../screens/home/types";
import type { MealDraft } from "./types";

export const FAVORITES_KEY = "ritatu:favorites";

// Same product, same favorite: a barcode when there is one, otherwise the name,
// so a product scanned today and one added from search last week match.
export const favoriteKey = (food: { code?: string | null; name: string }) =>
  food.code ? `code:${food.code}` : `name:${normalize(food.name.trim())}`;

export const getFavorites = async (): Promise<FoodItem[]> => {
  const raw = await AsyncStorage.getItem(FAVORITES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as FoodItem[];
  } catch {
    return [];
  }
};

const saveFavorites = (items: FoodItem[]) => AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(items));

// A logged meal or scan result as a favorite. It keeps the amount that was
// logged, so the next add is pre-filled with the usual portion.
export const draftToFavorite = (draft: MealDraft): FoodItem => {
  const base = { code: draft.barcode ?? undefined, imageUrl: draft.photoUrl ?? null };
  if (draft.source === "quick") {
    // Quick entries are one portion: keep them as a portion, not "100 g".
    const totals = calculateMealMacros(draft, draft.weightG);
    return {
      ...base,
      id: `fav:${favoriteKey({ name: draft.name })}`,
      name: draft.name,
      detail: "Porcja",
      calories: Math.round(totals.kcal),
      protein: totals.proteinG,
      carbs: totals.carbsG,
      fat: totals.fatG,
      per100: false,
      portionWeightG: draft.weightG,
      oneTime: true,
      defaultAmount: 1,
    };
  }
  return {
    ...base,
    id: `fav:${favoriteKey({ code: draft.barcode, name: draft.name })}`,
    name: draft.name,
    detail: draft.barcode ? "Zeskanowany" : "100 g",
    calories: Math.round(calculateMealMacros(draft, 100).kcal),
    protein: draft.proteinPer100g,
    carbs: draft.carbsPer100g,
    fat: draft.fatPer100g,
    per100: true,
    defaultAmount: draft.weightG,
  };
};

// Loaded on focus so a heart tapped on the scanner shows up in the diary.
export const useFavorites = () => {
  const [favorites, setFavorites] = useState<FoodItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getFavorites().then((items) => { if (active) setFavorites(items); });
      return () => { active = false; };
    }, []),
  );

  const isFavorite = useCallback(
    (food: { code?: string | null; name: string }) => {
      const key = favoriteKey(food);
      return favorites.some((f) => favoriteKey(f) === key);
    },
    [favorites],
  );

  // Returns whether the item is a favorite afterwards.
  const toggleFavorite = useCallback(async (item: FoodItem): Promise<boolean> => {
    const current = await getFavorites();
    const key = favoriteKey(item);
    const exists = current.some((f) => favoriteKey(f) === key);
    const next = exists
      ? current.filter((f) => favoriteKey(f) !== key)
      : [{ ...item, id: `fav:${key}`, custom: false }, ...current];
    await saveFavorites(next);
    setFavorites(next);
    return !exists;
  }, []);

  return { favorites, isFavorite, toggleFavorite };
};
