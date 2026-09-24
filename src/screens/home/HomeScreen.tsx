import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MacroConfirmSheet } from "../../components/MacroConfirmSheet";
import { toDateKey } from "../../core/date";
import { getSectionByTime, isSection, type Section } from "../../core/section";
import { cacheMealsForDay, getCachedMealsForDay } from "../../data/mealRepository";
import type { MealDraft, MealEntry } from "../../data/types";
import { CUSTOM_PRODUCTS_KEY } from "../../data/developerRepository";
import { useAuth } from "../../providers/AuthProvider";
import { useMeals } from "../../providers/MealsProvider";
import { useUserProfile } from "../../providers/UserProfileProvider";
import { colors } from "../../theme/colors";
import { AddFoodSheet } from "./AddFoodSheet";
import { CreateCustomSheet } from "./CreateCustomSheet";
import { DiaryView } from "./DiaryView";
import { FoodDetailSheet } from "./FoodDetailSheet";
import { QuickAddSheet } from "./QuickAddSheet";
import type { FoodItem } from "./types";

export const HomeScreen = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const insets = useSafeAreaInsets();
  const { dateOffset, setDateOffset, selectedDate, addMeal } = useMeals();
  const selectedKey = toDateKey(selectedDate);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [customProducts, setCustomProducts] = useState<FoodItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [addFoodSection, setAddFoodSection] = useState<Section | null>(null);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [showCreateCustom, setShowCreateCustom] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddSection, setQuickAddSection] = useState<Section | null>(null);
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);
  const lastAmountsRef = useRef<Map<string | number, string>>(new Map());
  const { add } = useLocalSearchParams<{ add?: string }>();

  // `/home?add=Obiad` opens the search sheet (FAB "Wyszukaj", scanner fallback).
  useEffect(() => {
    if (!add) return;
    setAddFoodSection(isSection(add) ? add : getSectionByTime());
    router.setParams({ add: undefined });
  }, [add]);

  // One loader for day changes, returns from the scanner/photo screens and
  // saves. The guard drops a slow read for a day the user already left.
  useFocusEffect(
    useCallback(() => {
      if (!user) return undefined;
      let active = true;
      void getCachedMealsForDay(user.uid, selectedDate).then((next) => {
        if (active) setMeals(next);
      });
      return () => { active = false; };
    }, [selectedKey, refreshKey, user]),
  );

  useEffect(() => {
    void AsyncStorage.getItem(CUSTOM_PRODUCTS_KEY).then((value) => {
      if (value) { try { setCustomProducts(JSON.parse(value) as FoodItem[]); } catch {} }
    });
  }, []);

  const saveCustomProducts = useCallback(async (next: FoodItem[]) => {
    await AsyncStorage.setItem(CUSTOM_PRODUCTS_KEY, JSON.stringify(next));
    setCustomProducts(next);
  }, []);

  const handleAddConfirm = useCallback(async (food: FoodItem, amount: number, sectionOverride?: Section) => {
    if (!user) return;
    const section = sectionOverride ?? addFoodSection;
    if (!section) return;
    const pw = food.portionWeightG ?? 100;
    const weightG = food.per100 ? amount : amount * pw;
    const toPer100 = (total: number) => (food.per100 ? total : pw > 0 ? (total / pw) * 100 : 0);
    await addMeal({
      name: food.name,
      weightG,
      proteinPer100g: toPer100(food.protein),
      carbsPer100g: toPer100(food.carbs),
      fatPer100g: toPer100(food.fat),
      kcalPer100g: toPer100(food.calories),
      source: food.code ? "barcode" : food.oneTime ? "quick" : "manual",
      section,
      barcode: food.code ?? null,
      photoUrl: food.imageUrl ?? null,
    });
    setSelectedFood(null);
    setAddFoodSection(null);
    setRefreshKey((k) => k + 1);
  }, [addFoodSection, addMeal, user]);

  const handleRemoveMeal = useCallback(async (id: string) => {
    if (!user) return;
    const updated = meals.filter((m) => m.id !== id);
    await cacheMealsForDay(user.uid, selectedDate, updated);
    setMeals(updated);
  }, [meals, selectedDate, user]);

  const handleMoveMeal = useCallback(async (id: string, toSection: Section) => {
    if (!user) return;
    const updated = meals.map((m) => m.id === id ? { ...m, section: toSection } : m);
    await cacheMealsForDay(user.uid, selectedDate, updated);
    setMeals(updated);
  }, [meals, selectedDate, user]);

  const handleEditMealSave = useCallback(async (draft: MealDraft) => {
    if (!user || !editingMeal) return;
    const updated = meals.map((m) =>
      m.id === editingMeal.id
        ? { ...m, name: draft.name, weightG: draft.weightG, proteinPer100g: draft.proteinPer100g, carbsPer100g: draft.carbsPer100g, fatPer100g: draft.fatPer100g, kcalPer100g: draft.kcalPer100g ?? m.kcalPer100g, section: draft.section ?? m.section }
        : m,
    );
    await cacheMealsForDay(user.uid, selectedDate, updated);
    setMeals(updated);
    setEditingMeal(null);
  }, [editingMeal, meals, selectedDate, user]);

  const handleEditMealDelete = useCallback(async () => {
    if (!user || !editingMeal) return;
    const updated = meals.filter((m) => m.id !== editingMeal.id);
    await cacheMealsForDay(user.uid, selectedDate, updated);
    setMeals(updated);
    setEditingMeal(null);
  }, [editingMeal, meals, selectedDate, user]);

  // Memoized: the sheet resets its fields whenever the draft object changes,
  // so a fresh literal per render wiped the weight the user was typing.
  const editDraft = useMemo<MealDraft | null>(
    () =>
      editingMeal
        ? {
            name: editingMeal.name,
            weightG: editingMeal.weightG,
            proteinPer100g: editingMeal.proteinPer100g,
            carbsPer100g: editingMeal.carbsPer100g,
            fatPer100g: editingMeal.fatPer100g,
            kcalPer100g: editingMeal.kcalPer100g,
            source: editingMeal.source,
            section: editingMeal.section,
          }
        : null,
    [editingMeal],
  );

  return (
    <View style={[home.wrap, { paddingTop: insets.top }]}>
      <DiaryView
        meals={meals}
        dateOffset={dateOffset}
        currentDate={selectedDate}
        setDateOffset={setDateOffset}
        profile={profile}
        onAddFood={setAddFoodSection}
        onRemoveMeal={handleRemoveMeal}
        onMoveMeal={handleMoveMeal}
        onEditMeal={setEditingMeal}
      />

      <AddFoodSheet
        visible={addFoodSection !== null}
        section={addFoodSection ?? ""}
        uid={user?.uid ?? ""}
        customProducts={customProducts}
        onClose={() => setAddFoodSection(null)}
        onSelectFood={setSelectedFood}
        onOpenCreateCustom={() => setShowCreateCustom(true)}
        onQuickAdd={() => {
          setQuickAddSection(addFoodSection);
          setAddFoodSection(null);
          setShowQuickAdd(true);
        }}
        onScanBarcode={() => {
          const section = addFoodSection ?? "";
          setAddFoodSection(null);
          router.push({ pathname: "/add-meal/barcode", params: section ? { section } : undefined });
        }}
        onAnalyzePhoto={() => {
          const section = addFoodSection ?? "";
          setAddFoodSection(null);
          router.push({ pathname: "/add-meal/photo", params: section ? { section } : undefined });
        }}
      />

      <FoodDetailSheet
        visible={selectedFood !== null}
        food={selectedFood}
        section={addFoodSection ?? ""}
        lastAmounts={lastAmountsRef.current}
        onClose={() => setSelectedFood(null)}
        onAdd={handleAddConfirm}
      />

      <CreateCustomSheet
        visible={showCreateCustom}
        onClose={() => setShowCreateCustom(false)}
        onSave={async (product) => {
          await saveCustomProducts([product, ...customProducts]);
          setShowCreateCustom(false);
        }}
      />

      <QuickAddSheet
        visible={showQuickAdd}
        section={quickAddSection ?? "Przekąska"}
        onClose={() => { setShowQuickAdd(false); setQuickAddSection(null); }}
        onConfirm={async (food) => {
          if (!quickAddSection) return;
          await handleAddConfirm(food, 1, quickAddSection);
          setShowQuickAdd(false);
          setQuickAddSection(null);
        }}
      />

      <MacroConfirmSheet
        visible={editingMeal !== null}
        draft={editDraft}
        editingMealId={editingMeal?.id}
        onClose={() => setEditingMeal(null)}
        onConfirm={handleEditMealSave}
        onDelete={handleEditMealDelete}
      />
    </View>
  );
};

const home = StyleSheet.create({
  wrap: { backgroundColor: colors.background, flex: 1 },
});
