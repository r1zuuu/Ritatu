import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MacroConfirmSheet } from "../../components/MacroConfirmSheet";
import { dateWithOffset } from "../../core/date";
import type { Section } from "../../core/section";
import { addMeal as addMealRepo, cacheMealsForDay, getCachedMealsForDay } from "../../data/mealRepository";
import { deleteProgressPhoto, getProgressPhotos, saveProgressPhotos } from "../../data/progressPhotoRepository";
import type { MealDraft, MealEntry, ProgressPhoto, WeightEntry } from "../../data/types";
import { CUSTOM_PRODUCTS_KEY, WEIGHTS_KEY } from "../../data/developerRepository";
import { useAuth } from "../../providers/AuthProvider";
import { useUserProfile } from "../../providers/UserProfileProvider";
import { colors } from "../../theme/colors";
import { sh } from "../../theme/sharedStyles";
import { AddFoodSheet } from "./AddFoodSheet";
import { AddProgressPhotoSheet } from "./AddProgressPhotoSheet";
import { AddWeightSheet } from "./AddWeightSheet";
import { CreateCustomSheet } from "./CreateCustomSheet";
import { DiaryView } from "./DiaryView";
import { FoodDetailSheet } from "./FoodDetailSheet";
import { MeasurementsView } from "./MeasurementsView";
import { QuickAddSheet } from "./QuickAddSheet";
import type { FoodItem } from "./types";

type HomeTab = "diary" | "measurements";

function todayDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export const HomeScreen = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<HomeTab>("diary");
  const [dateOffset, setDateOffset] = useState(0);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [customProducts, setCustomProducts] = useState<FoodItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [addFoodSection, setAddFoodSection] = useState<Section | null>(null);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [showCreateCustom, setShowCreateCustom] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddSection, setQuickAddSection] = useState<Section | null>(null);
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);
  const lastAmountsRef = useRef<Map<string | number, string>>(new Map());

  // Reset to today when app returns from background after midnight
  useEffect(() => {
    const lastKey = { current: todayDateKey() };
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        const newKey = todayDateKey();
        if (newKey !== lastKey.current) {
          lastKey.current = newKey;
          setDateOffset(0);
          setRefreshKey((k) => k + 1);
        }
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!user) return;
    void getCachedMealsForDay(user.uid, dateWithOffset(dateOffset)).then(setMeals);
  }, [dateOffset, refreshKey, user]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return undefined;
      let active = true;
      void getCachedMealsForDay(user.uid, dateWithOffset(dateOffset)).then((next) => {
        if (active) setMeals(next);
      });
      return () => { active = false; };
    }, [dateOffset, user]),
  );

  useEffect(() => {
    void AsyncStorage.getItem(WEIGHTS_KEY).then((value) => {
      if (value) { try { setWeights(JSON.parse(value) as WeightEntry[]); } catch {} }
    });
    void getProgressPhotos().then(setProgressPhotos);
    void AsyncStorage.getItem(CUSTOM_PRODUCTS_KEY).then((value) => {
      if (value) { try { setCustomProducts(JSON.parse(value) as FoodItem[]); } catch {} }
    });
  }, []);

  const saveWeights = useCallback(async (next: WeightEntry[]) => {
    await AsyncStorage.setItem(WEIGHTS_KEY, JSON.stringify(next));
    setWeights(next);
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
    await addMealRepo({
      userId: user.uid,
      name: food.name,
      weightG,
      proteinPer100g: toPer100(food.protein),
      carbsPer100g: toPer100(food.carbs),
      fatPer100g: toPer100(food.fat),
      kcalPer100g: toPer100(food.calories),
      timestamp: dateWithOffset(dateOffset),
      source: food.code ? "barcode" : food.oneTime ? "quick" : "manual",
      section,
      barcode: food.code ?? null,
      photoUrl: food.imageUrl ?? null,
    });
    setSelectedFood(null);
    setAddFoodSection(null);
    setRefreshKey((k) => k + 1);
  }, [addFoodSection, dateOffset, user]);

  const handleRemoveMeal = useCallback(async (id: string) => {
    if (!user) return;
    const updated = meals.filter((m) => m.id !== id);
    await cacheMealsForDay(user.uid, dateWithOffset(dateOffset), updated);
    setMeals(updated);
  }, [dateOffset, meals, user]);

  const handleMoveMeal = useCallback(async (id: string, toSection: Section) => {
    if (!user) return;
    const updated = meals.map((m) => m.id === id ? { ...m, section: toSection } : m);
    await cacheMealsForDay(user.uid, dateWithOffset(dateOffset), updated);
    setMeals(updated);
  }, [dateOffset, meals, user]);

  const handleEditMealSave = useCallback(async (draft: MealDraft) => {
    if (!user || !editingMeal) return;
    const updated = meals.map((m) =>
      m.id === editingMeal.id
        ? { ...m, name: draft.name, weightG: draft.weightG, proteinPer100g: draft.proteinPer100g, carbsPer100g: draft.carbsPer100g, fatPer100g: draft.fatPer100g, kcalPer100g: draft.kcalPer100g ?? m.kcalPer100g, section: draft.section ?? m.section }
        : m,
    );
    await cacheMealsForDay(user.uid, dateWithOffset(dateOffset), updated);
    setMeals(updated);
    setEditingMeal(null);
  }, [dateOffset, editingMeal, meals, user]);

  const handleEditMealDelete = useCallback(async () => {
    if (!user || !editingMeal) return;
    const updated = meals.filter((m) => m.id !== editingMeal.id);
    await cacheMealsForDay(user.uid, dateWithOffset(dateOffset), updated);
    setMeals(updated);
    setEditingMeal(null);
  }, [dateOffset, editingMeal, meals, user]);

  const handleAddWeight = useCallback(async (kg: number) => {
    const now = new Date();
    const entry: WeightEntry = {
      id: Date.now().toString(36),
      date: `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}`,
      weightKg: kg,
    };
    await saveWeights([...weights, entry]);
    setShowAddWeight(false);
  }, [saveWeights, weights]);

  const handleSavePhoto = useCallback(async (photo: ProgressPhoto) => {
    const next = [photo, ...progressPhotos];
    await saveProgressPhotos(next);
    setProgressPhotos(next);
  }, [progressPhotos]);

  const handleDeletePhoto = useCallback(async (id: string) => {
    const next = await deleteProgressPhoto(id);
    setProgressPhotos(next);
  }, []);

  const currentDate = dateWithOffset(dateOffset);
  const currentWeight = weights.at(-1)?.weightKg;

  return (
    <View style={[home.wrap, { paddingTop: insets.top }]}>
      <View style={home.tabRow}>
        {(["diary", "measurements"] as HomeTab[]).map((id) => {
          const label = id === "diary" ? "Dziennik" : "Pomiary";
          const active = tab === id;
          return (
            <Pressable
              key={id}
              style={({ pressed }) => [home.tabChip, active && home.tabChipActive, pressed && sh.pressed]}
              onPress={() => setTab(id)}
            >
              <Text style={[home.tabChipLabel, active && home.tabChipLabelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={home.content}>
        {tab === "diary" ? (
          <DiaryView
            meals={meals}
            dateOffset={dateOffset}
            currentDate={currentDate}
            setDateOffset={setDateOffset}
            profile={profile}
            onAddFood={setAddFoodSection}
            onRemoveMeal={handleRemoveMeal}
            onMoveMeal={handleMoveMeal}
            onEditMeal={setEditingMeal}
          />
        ) : (
          <MeasurementsView
            weights={weights}
            profile={profile}
            progressPhotos={progressPhotos}
            onAddWeight={() => setShowAddWeight(true)}
            onAddPhoto={() => setShowAddPhoto(true)}
            onDeletePhoto={handleDeletePhoto}
          />
        )}
      </View>

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
        onManualEntry={() => {
          const section = addFoodSection ?? "";
          setAddFoodSection(null);
          router.push({ pathname: "/add-meal/manual", params: section ? { section } : undefined });
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

      <AddWeightSheet
        visible={showAddWeight}
        lastWeight={currentWeight}
        onClose={() => setShowAddWeight(false)}
        onSave={handleAddWeight}
      />

      <AddProgressPhotoSheet
        visible={showAddPhoto}
        currentWeight={currentWeight}
        onClose={() => setShowAddPhoto(false)}
        onSave={handleSavePhoto}
      />

      <MacroConfirmSheet
        visible={editingMeal !== null}
        draft={editingMeal ? {
          name: editingMeal.name,
          weightG: editingMeal.weightG,
          proteinPer100g: editingMeal.proteinPer100g,
          carbsPer100g: editingMeal.carbsPer100g,
          fatPer100g: editingMeal.fatPer100g,
          source: editingMeal.source,
          section: editingMeal.section,
        } : null}
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
  content: { flex: 1 },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 4,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  tabChip: {
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  tabChipActive: {
    backgroundColor: colors.accentA,
    borderColor: colors.accent,
  },
  tabChipLabel: {
    color: colors.muted,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  tabChipLabelActive: { color: colors.accent },
});

