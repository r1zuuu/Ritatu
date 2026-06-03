import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  DimensionValue,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "../components/Icon";
import { calculateMealMacros, summarizeMeals } from "../core/macroCalculator";
import { addMeal as addMealRepo, cacheMealsForDay, getCachedMealsForDay } from "../data/mealRepository";
import {
  deleteProgressPhoto,
  getProgressPhotos,
  persistProgressPhotoFile,
  saveProgressPhotos,
} from "../data/progressPhotoRepository";
import type { MealEntry, ProgressPhoto, ProgressPhotoAngle, WeightEntry } from "../data/types";
import { CUSTOM_PRODUCTS_KEY, WEIGHTS_KEY } from "../data/developerRepository";
import { useAuth } from "../providers/AuthProvider";
import { useUserProfile } from "../providers/UserProfileProvider";
import { searchProductsByName, type OpenFoodFactsSearchItem } from "../services/openFoodFactsService";
import { HistoryScreen } from "./HistoryScreen";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

type FoodItem = {
  id: number | string;
  name: string;
  detail: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  per100: boolean;
  portionWeightG?: number;
  custom?: boolean;
  code?: string;
  imageUrl?: string | null;
};

const SECTIONS = ["Śniadanie", "Obiad", "Kolacja", "Przekąska"] as const;
type Section = typeof SECTIONS[number];
type HomeTab = "diary" | "measurements" | "history";

const SECTION_COLORS: Record<Section, string> = {
  Śniadanie: colors.carbs,
  Obiad: colors.fat,
  Kolacja: "#7B8EFA",
  Przekąska: colors.green,
};

const FOOD_DB: FoodItem[] = [
  // Mięso i ryby
  { id: 10, name: "Kurczak, pierś", detail: "100 g", calories: 165, protein: 31, carbs: 0, fat: 3.6, per100: true },
  { id: 16, name: "Łosoś, filet", detail: "100 g", calories: 208, protein: 20.4, carbs: 0, fat: 13.6, per100: true },
  { id: 20, name: "Wołowina, mielona", detail: "100 g", calories: 215, protein: 20.7, carbs: 0, fat: 14.2, per100: true },
  { id: 21, name: "Tuńczyk w wodzie", detail: "100 g", calories: 108, protein: 23.6, carbs: 0, fat: 1, per100: true },
  // Nabiał
  { id: 14, name: "Twaróg chudy", detail: "100 g", calories: 98, protein: 17.4, carbs: 3.1, fat: 1, per100: true },
  { id: 17, name: "Jogurt naturalny", detail: "100 g", calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3, per100: true },
  { id: 13, name: "Jajko kurze", detail: "1 szt (60 g)", calories: 86, protein: 7.5, carbs: 0.6, fat: 5.8, per100: false, portionWeightG: 60 },
  { id: 22, name: "Ser żółty", detail: "100 g", calories: 352, protein: 25.4, carbs: 1.3, fat: 27.8, per100: true },
  { id: 23, name: "Mleko 2%", detail: "100 ml", calories: 50, protein: 3.4, carbs: 4.8, fat: 2, per100: true },
  // Węglowodany
  { id: 11, name: "Ryż biały, gotowany", detail: "100 g", calories: 130, protein: 2.7, carbs: 28, fat: 0.3, per100: true },
  { id: 15, name: "Ziemniaki, gotowane", detail: "100 g", calories: 87, protein: 1.9, carbs: 20, fat: 0.1, per100: true },
  { id: 18, name: "Chleb żytni", detail: "1 kromka (40 g)", calories: 88, protein: 3.1, carbs: 17.2, fat: 0.8, per100: false, portionWeightG: 40 },
  { id: 24, name: "Makaron, gotowany", detail: "100 g", calories: 131, protein: 5, carbs: 25, fat: 1.1, per100: true },
  { id: 25, name: "Płatki owsiane", detail: "100 g", calories: 379, protein: 13.2, carbs: 67.7, fat: 7, per100: true },
  { id: 26, name: "Chleb pszenny", detail: "1 kromka (35 g)", calories: 83, protein: 2.7, carbs: 15.8, fat: 0.9, per100: false, portionWeightG: 35 },
  // Warzywa
  { id: 12, name: "Brokuł", detail: "100 g", calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4, per100: true },
  { id: 27, name: "Marchewka", detail: "100 g", calories: 41, protein: 0.9, carbs: 9.6, fat: 0.2, per100: true },
  { id: 28, name: "Pomidor", detail: "100 g", calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, per100: true },
  { id: 29, name: "Ogórek", detail: "100 g", calories: 15, protein: 0.6, carbs: 3.6, fat: 0.1, per100: true },
  { id: 30, name: "Papryka czerwona", detail: "100 g", calories: 31, protein: 1, carbs: 6, fat: 0.3, per100: true },
  { id: 31, name: "Szpinak", detail: "100 g", calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, per100: true },
  { id: 32, name: "Cebula", detail: "100 g", calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, per100: true },
  { id: 33, name: "Czosnek", detail: "1 ząbek (5 g)", calories: 7, protein: 0.3, carbs: 1.5, fat: 0, per100: false, portionWeightG: 5 },
  { id: 34, name: "Awokado", detail: "100 g", calories: 160, protein: 2, carbs: 8.5, fat: 14.7, per100: true },
  // Owoce
  { id: 35, name: "Banan", detail: "100 g", calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, per100: true },
  { id: 36, name: "Jabłko", detail: "100 g", calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2, per100: true },
  { id: 37, name: "Pomarańcza", detail: "100 g", calories: 47, protein: 0.9, carbs: 11.8, fat: 0.1, per100: true },
  { id: 38, name: "Truskawki", detail: "100 g", calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, per100: true },
  { id: 39, name: "Winogrona", detail: "100 g", calories: 69, protein: 0.7, carbs: 18.1, fat: 0.2, per100: true },
  { id: 40, name: "Gruszka", detail: "100 g", calories: 57, protein: 0.4, carbs: 15.2, fat: 0.1, per100: true },
  { id: 41, name: "Kiwi", detail: "100 g", calories: 61, protein: 1.1, carbs: 14.7, fat: 0.5, per100: true },
  { id: 42, name: "Borówki", detail: "100 g", calories: 57, protein: 0.7, carbs: 14.5, fat: 0.3, per100: true },
  { id: 43, name: "Mango", detail: "100 g", calories: 60, protein: 0.8, carbs: 15, fat: 0.4, per100: true },
  { id: 44, name: "Ananas", detail: "100 g", calories: 50, protein: 0.5, carbs: 13.1, fat: 0.1, per100: true },
  // Tłuszcze i przekąski
  { id: 19, name: "Migdały", detail: "100 g", calories: 579, protein: 21.2, carbs: 21.7, fat: 49.9, per100: true },
  { id: 45, name: "Oliwa z oliwek", detail: "1 łyżka (10 g)", calories: 88, protein: 0, carbs: 0, fat: 10, per100: false, portionWeightG: 10 },
  { id: 46, name: "Masło orzechowe", detail: "100 g", calories: 588, protein: 25, carbs: 20, fat: 50, per100: true },
  { id: 47, name: "Orzechy włoskie", detail: "100 g", calories: 654, protein: 15.2, carbs: 13.7, fat: 65.2, per100: true },
];

const parseDecimal = (value: string) => Number(value.replace(",", "."));
const formatDecimal = (value: number, decimals = 1) => {
  const rounded = Number(value.toFixed(decimals));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

function dateWithOffset(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
}

function formatDateLabel(offset: number) {
  if (offset === 0) return "Dziś";
  if (offset === -1) return "Wczoraj";
  const d = dateWithOffset(offset);
  const months = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function formatDateSub(offset: number) {
  const d = dateWithOffset(offset);
  const months = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function mealKcal(meal: MealEntry) {
  return Math.round(calculateMealMacros(meal, meal.weightG).kcal);
}

function openFoodFactsItemToFoodItem(item: OpenFoodFactsSearchItem): FoodItem {
  return {
    id: `off:${item.code}`,
    code: item.code,
    name: item.name,
    detail: item.detail,
    calories: Math.round(item.calories),
    protein: item.proteinPer100g,
    carbs: item.carbsPer100g,
    fat: item.fatPer100g,
    per100: true,
    imageUrl: item.imageUrl ?? null,
  };
}

function Sheet({ visible, onClose, title, children, height = "88%" }: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  height?: DimensionValue;
}) {
  const close = () => { Keyboard.dismiss(); onClose(); };
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={sheet.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={[sheet.surface, { height }]}>
          <View style={sheet.handle} />
          {title ? (
            <View style={sheet.titleRow}>
              <Text style={sheet.title}>{title}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Zamknij"
                style={({ pressed }) => [sheet.close, pressed && sheet.pressed]}
                onPress={close}
              >
                <Icon name="x" size={18} color={colors.mutedMid} />
              </Pressable>
            </View>
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

function IconButton({ icon, label, onPress, tone = "default", disabled = false }: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: "default" | "accent";
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        ui.iconButton,
        tone === "accent" && ui.iconButtonAccent,
        disabled && ui.disabled,
        !disabled && pressed && ui.pressed,
      ]}
    >
      <Icon name={icon} size={18} color={disabled ? colors.muted : tone === "accent" ? colors.accent : colors.text} />
    </Pressable>
  );
}

function MacroBar({ label, current, goal, color }: { label: string; current: number; goal: number; color: string }) {
  const pct = Math.min(goal > 0 ? (current / goal) * 100 : 0, 100);
  return (
    <View style={macro.wrap}>
      <View style={macro.row}>
        <Text style={macro.label}>{label}</Text>
        <Text style={macro.value}>
          {Math.round(current)}
          <Text style={macro.goal}>/{Math.round(goal)}g</Text>
        </Text>
      </View>
      <View style={macro.track}>
        <View style={[macro.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function DiaryView({ meals, dateOffset, setDateOffset, profile, onAddFood, onRemoveMeal, onMoveMeal }: {
  meals: MealEntry[];
  dateOffset: number;
  setDateOffset: (value: number) => void;
  profile: ReturnType<typeof useUserProfile>["profile"];
  onAddFood: (section: Section) => void;
  onRemoveMeal: (id: string) => void;
  onMoveMeal: (id: string, toSection: Section) => void;
}) {
  const totals = useMemo(() => {
    const summary = summarizeMeals(meals);
    return {
      kcal: Math.round(summary.kcal),
      protein: Math.round(summary.proteinG * 10) / 10,
      carbs: Math.round(summary.carbsG * 10) / 10,
      fat: Math.round(summary.fatG * 10) / 10,
    };
  }, [meals]);

  const goalKcal = profile?.goalKcal ?? 2200;
  const goalProtein = profile?.goalProteinG ?? 150;
  const goalCarbs = profile?.goalCarbsG ?? 270;
  const goalFat = profile?.goalFatG ?? 73;
  const remaining = goalKcal - totals.kcal;
  const pctKcal = Math.min((totals.kcal / goalKcal) * 100, 100);

  const mealsBySection = useMemo(() => {
    return Object.fromEntries(
      SECTIONS.map((section) => [section, meals.filter((meal) => (meal.section === section) || (section === "Przekąska" && !meal.section))]),
    ) as Record<Section, MealEntry[]>;
  }, [meals]);

  return (
    <ScrollView contentContainerStyle={diary.scroll} showsVerticalScrollIndicator={false}>
      <View style={diary.dateRow}>
        <IconButton icon="chevron-left" label="Poprzedni dzień" onPress={() => setDateOffset(dateOffset - 1)} />
        <Pressable
          style={({ pressed }) => [diary.dateCenter, pressed && { opacity: 0.7 }]}
          onPress={() => dateOffset !== 0 && setDateOffset(0)}
          accessibilityRole="button"
          accessibilityLabel="Wróć do dzisiaj"
        >
          <Text style={diary.dateLabel}>{formatDateLabel(dateOffset)}</Text>
          <Text style={diary.dateSub}>{formatDateSub(dateOffset)}</Text>
          {dateOffset !== 0 ? <Text style={diary.todayPill}>Dziś →</Text> : null}
        </Pressable>
        <View style={diary.dateRowRight}>
          <IconButton icon="chevron-right" label="Następny dzień" disabled={dateOffset >= 0} onPress={() => setDateOffset(dateOffset + 1)} />
          <IconButton icon="settings" label="Ustawienia" onPress={() => router.push("/profile")} />
        </View>
      </View>

      <View style={diary.summaryCard}>
        <Text style={diary.cardLabel}>Kalorie</Text>
        <View style={diary.kcalRow}>
          <Text style={diary.kcalBig}>{totals.kcal}</Text>
          <View style={diary.kcalSide}>
            <Text style={diary.kcalGoal}>z {Math.round(goalKcal)} kcal</Text>
            <Text style={[diary.remaining, { color: remaining >= 0 ? colors.green : colors.danger }]}>
              {remaining >= 0 ? `${remaining} pozostało` : `${Math.abs(remaining)} za dużo`}
            </Text>
          </View>
        </View>
        <View style={diary.kcalTrack}>
          <View style={[diary.kcalFill, { width: `${pctKcal}%`, backgroundColor: pctKcal >= 100 ? colors.danger : colors.accent }]} />
        </View>
        <View style={diary.macroStack}>
          <MacroBar label="Białko" current={totals.protein} goal={goalProtein} color={colors.protein} />
          <MacroBar label="Węglowodany" current={totals.carbs} goal={goalCarbs} color={colors.carbs} />
          <MacroBar label="Tłuszcze" current={totals.fat} goal={goalFat} color={colors.fat} />
        </View>
      </View>

      <View style={diary.timeline}>
        {SECTIONS.map((section, index) => {
          const sectionMeals = mealsBySection[section] ?? [];
          const sectionKcal = sectionMeals.reduce((sum, meal) => sum + mealKcal(meal), 0);
          const dot = SECTION_COLORS[section];
          const last = index === SECTIONS.length - 1;

          return (
            <View key={section} style={diary.timelineRow}>
              <View style={diary.spine}>
                <View style={[diary.dot, { backgroundColor: dot }]} />
                {!last ? <View style={[diary.line, { backgroundColor: `${dot}55` }]} /> : null}
              </View>
              <View style={[diary.section, last && { paddingBottom: 4 }]}>
                <View style={diary.sectionHeader}>
                  <View style={diary.sectionTitleRow}>
                    <Text style={diary.sectionTitle}>{section}</Text>
                    {sectionKcal > 0 ? (
                      <View style={[diary.kcalPill, { backgroundColor: `${dot}22` }]}>
                        <Text style={[diary.kcalPillText, { color: dot }]}>{sectionKcal} kcal</Text>
                      </View>
                    ) : null}
                  </View>
                  <IconButton icon="plus" label={`Dodaj do ${section}`} tone="accent" onPress={() => onAddFood(section)} />
                </View>

                {sectionMeals.length > 0 ? (
                  <View style={diary.foodList}>
                    {sectionMeals.map((meal, mealIndex) => {
                      const macros = calculateMealMacros(meal, meal.weightG);
                      return (
                        <Pressable
                          key={meal.id}
                          style={({ pressed }) => [diary.foodRow, mealIndex > 0 && diary.foodBorder, pressed && { opacity: 0.75 }]}
                          onLongPress={() => {
                            const targets = SECTIONS.filter((s) => s !== section);
                            Alert.alert(
                              meal.name,
                              "Przenieś do:",
                              [
                                ...targets.map((s) => ({ text: s, onPress: () => onMoveMeal(meal.id, s) })),
                                { text: "Anuluj", style: "cancel" as const },
                              ],
                            );
                          }}
                          delayLongPress={400}
                        >
                          <View style={diary.foodIcon}>
                            <Icon name={meal.source === "barcode" ? "barcode" : meal.source === "photo" ? "camera" : "utensils"} size={17} color={colors.accent} />
                          </View>
                          <View style={diary.foodText}>
                            <Text style={diary.foodName} numberOfLines={1}>{meal.name}</Text>
                            <Text style={diary.foodSub}>{Math.round(meal.weightG)} g</Text>
                          </View>
                          <Text style={diary.foodKcal}>{Math.round(macros.kcal)} kcal</Text>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Usuń ${meal.name}`}
                            style={({ pressed }) => [diary.remove, pressed && ui.pressed]}
                            onPress={() => onRemoveMeal(meal.id)}
                          >
                            <Icon name="x" size={14} color={colors.muted} />
                          </Pressable>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Dodaj produkt do ${section}`}
                    style={({ pressed }) => [diary.emptyFood, pressed && ui.pressed]}
                    onPress={() => onAddFood(section)}
                  >
                    <Icon name="plus" size={14} color={colors.mutedMid} />
                    <Text style={diary.emptyFoodText}>Dodaj produkt</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function AddFoodSheet({ visible, section, uid, onClose, onSelectFood, customProducts, onOpenCreateCustom, onQuickAdd, onScanBarcode, onAnalyzePhoto, onManualEntry }: {
  visible: boolean;
  section: string;
  uid: string;
  onClose: () => void;
  onSelectFood: (food: FoodItem) => void;
  customProducts: FoodItem[];
  onOpenCreateCustom: () => void;
  onQuickAdd: () => void;
  onScanBarcode: () => void;
  onAnalyzePhoto: () => void;
  onManualEntry: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"search" | "recent" | "custom">("search");
  const [remoteFoods, setRemoteFoods] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recentFoods, setRecentFoods] = useState<FoodItem[]>([]);

  useEffect(() => {
    const trimmed = query.trim();
    if (activeTab !== "search" || trimmed.length < 3) {
      setRemoteFoods([]);
      setSearchError(null);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    setSearchError(null);

    const handle = setTimeout(() => {
      searchProductsByName(trimmed)
        .then((items) => {
          if (!cancelled) setRemoteFoods(items.map(openFoodFactsItemToFoodItem));
        })
        .catch(() => {
          if (!cancelled) {
            setRemoteFoods([]);
            setSearchError("Nie udało się pobrać produktów z Open Food Facts.");
          }
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [activeTab, query]);

  useEffect(() => {
    if (activeTab !== "recent") return;
    let cancelled = false;
    const load = async () => {
      const seen = new Map<string, FoodItem>();
      for (let i = 0; i < 7; i++) {
        const date = dateWithOffset(-i);
        const meals = await getCachedMealsForDay(uid, date);
        for (const m of meals) {
          const key = m.name.toLowerCase();
          if (!seen.has(key)) {
            seen.set(key, {
              id: `recent:${key}`,
              name: m.name,
              detail: "100 g",
              calories: Math.round(((m.proteinPer100g * 4) + (m.carbsPer100g * 4) + (m.fatPer100g * 9))),
              protein: m.proteinPer100g,
              carbs: m.carbsPer100g,
              fat: m.fatPer100g,
              per100: true,
            });
          }
        }
      }
      if (!cancelled) setRecentFoods([...seen.values()].slice(0, 20));
    };
    void load();
    return () => { cancelled = true; };
  }, [activeTab, uid]);

  const listData = useMemo(() => {
    if (activeTab === "search") {
      const trimmed = query.trim().toLowerCase();
      if (trimmed.length < 1) return FOOD_DB;

      const localMatches = FOOD_DB.filter((f) => f.name.toLowerCase().includes(trimmed));

      if (trimmed.length < 3 || remoteFoods.length === 0) return localMatches;

      const localNames = new Set(localMatches.map((f) => f.name.toLowerCase()));
      const onlyRemote = remoteFoods.filter((f) => !localNames.has(f.name.toLowerCase()));
      const merged = [...localMatches, ...onlyRemote];

      const score = (name: string, isLocal: boolean) => {
        const n = name.toLowerCase();
        const base = n === trimmed ? 30 : n.startsWith(trimmed) ? 20 : 10;
        return base + (isLocal ? 1 : 0);
      };

      return merged.sort((a, b) =>
        score(b.name, typeof b.id === "number") - score(a.name, typeof a.id === "number"),
      );
    }
    if (activeTab === "recent") return recentFoods;
    if (activeTab === "custom") return customProducts;
    return [];
  }, [activeTab, customProducts, query, remoteFoods, recentFoods]);

  const tabs = [
    { id: "search" as const, label: "Szukaj" },
    { id: "recent" as const, label: "Ostatnie" },
    { id: "custom" as const, label: "Własne" },
  ];

  return (
    <Sheet visible={visible} onClose={onClose} title={`Dodaj do: ${section}`} height="92%">
      <View style={add.wrap}>
        <View style={add.searchRow}>
          <Icon name="search" size={17} color={colors.muted} />
          <TextInput
            style={add.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Szukaj produktu..."
            placeholderTextColor={colors.muted}
            accessibilityLabel="Szukaj produktu"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skanuj kod kreskowy"
            style={({ pressed }) => [add.scanButton, pressed && ui.pressed]}
            onPress={onScanBarcode}
          >
            <Icon name="scan" size={18} color={colors.accent} />
          </Pressable>
        </View>

        <View style={add.quickGrid}>
          <ActionTile icon="barcode" label="Skan" onPress={onScanBarcode} />
          <ActionTile icon="camera" label="Zdjęcie" onPress={onAnalyzePhoto} />
          <ActionTile icon="plus" label="Ręcznie" onPress={onManualEntry} />
          <ActionTile icon="check" label="Jednoraz." onPress={onQuickAdd} />
        </View>

        <View style={add.tabs}>
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [add.tab, active && add.tabActive, pressed && ui.pressed]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[add.tabText, active && add.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {activeTab === "custom" ? (
          <Pressable style={({ pressed }) => [add.createCustom, pressed && ui.pressed]} onPress={onOpenCreateCustom}>
            <Icon name="plus" size={18} color={colors.accent} />
            <Text style={add.createCustomText}>Stwórz własny produkt</Text>
          </Pressable>
        ) : null}

        <FlatList
          data={listData}
          keyExtractor={(item) => String(item.id)}
          style={add.list}
          contentContainerStyle={add.listContent}
          ListEmptyComponent={
            <View style={add.empty}>
              <Icon name="search" size={28} color={colors.muted} />
              <Text style={add.emptyText}>
                {activeTab === "custom" ? "Brak własnych produktów" : activeTab === "recent" ? "Brak historii posiłków" : "Brak wyników"}
              </Text>
            </View>
          }
          ListFooterComponent={
            activeTab === "search" && query.trim().length >= 3 && (searching || searchError) ? (
              <Text style={add.status}>
                {searching ? "Szukam w Open Food Facts..." : searchError ?? ""}
              </Text>
            ) : null
          }
          renderItem={({ item, index }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Dodaj ${item.name}`}
              style={({ pressed }) => [add.foodRow, index > 0 && add.foodBorder, pressed && add.foodPressed]}
              onPress={() => onSelectFood(item)}
            >
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={add.foodImage} />
              ) : (
                <View style={add.foodIcon}>
                  <Icon name={item.custom ? "clipboard" : item.code ? "barcode" : "utensils"} size={17} color={colors.accent} />
                </View>
              )}
              <View style={add.foodText}>
                <Text style={add.foodName} numberOfLines={1}>{item.name}</Text>
                <Text style={add.foodDetail}>{item.detail} - {item.calories} kcal</Text>
              </View>
              <Icon name="plus" size={17} color={colors.mutedMid} />
            </Pressable>
          )}
        />
      </View>
    </Sheet>
  );
}

function ActionTile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [add.quickTile, pressed && ui.pressed]}
      onPress={onPress}
    >
      <Icon name={icon} size={18} color={colors.accent} />
      <Text style={add.quickLabel}>{label}</Text>
    </Pressable>
  );
}

function FoodDetailSheet({ visible, food, section, lastAmounts, onClose, onAdd }: {
  visible: boolean;
  food: FoodItem | null;
  section: string;
  lastAmounts: Map<string | number, string>;
  onClose: () => void;
  onAdd: (food: FoodItem, amount: number) => void;
}) {
  const [amountInput, setAmountInput] = useState("100");

  useEffect(() => {
    if (!food) return;
    const saved = lastAmounts.get(food.id);
    setAmountInput(saved ?? (food.per100 ? "100" : "1"));
  }, [food]);

  if (!food) return null;

  const parsedAmount = parseDecimal(amountInput);
  const hasValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const amount = hasValidAmount ? parsedAmount : 0;
  const multiplier = food.per100 ? amount / 100 : amount;
  const kcal = Math.round(food.calories * multiplier);
  const protein = Math.round(food.protein * multiplier * 10) / 10;
  const carbs = Math.round(food.carbs * multiplier * 10) / 10;
  const fat = Math.round(food.fat * multiplier * 10) / 10;
  const step = food.per100 ? 10 : 0.5;
  const portionW = food.portionWeightG ?? 100;
  const displayWeightG = food.per100 ? amount : Math.round(amount * portionW);

  const updateAmount = (val: string) => {
    setAmountInput(val);
    lastAmounts.set(food.id, val);
  };

  const changeAmount = (delta: number) => {
    const base = hasValidAmount ? parsedAmount : 1;
    updateAmount(formatDecimal(Math.max(1, base + delta), food.per100 ? 0 : 1));
  };

  return (
    <Sheet visible={visible} onClose={onClose} height="72%">
      <View style={detail.wrap}>
        <View style={detail.header}>
          {food.imageUrl ? (
            <Image source={{ uri: food.imageUrl }} style={detail.image} />
          ) : (
            <View style={detail.headerIcon}>
              <Icon name={food.code ? "barcode" : "utensils"} size={24} color={colors.accent} />
            </View>
          )}
          <View style={detail.headerText}>
            <Text style={detail.name} numberOfLines={2}>{food.name}</Text>
            <Text style={detail.sub}>Dodajesz do: <Text style={detail.accent}>{section}</Text></Text>
          </View>
        </View>

        <View style={detail.kcalBlock}>
          <Text style={detail.kcal}>{kcal}</Text>
          <Text style={detail.kcalLabel}>kcal</Text>
        </View>

        <View style={detail.macros}>
          <MacroTile label="Białko" value={protein} color={colors.protein} />
          <MacroTile label="Węgle" value={carbs} color={colors.carbs} />
          <MacroTile label="Tłuszcze" value={fat} color={colors.fat} />
        </View>

        <View style={detail.amountCard}>
          <Text style={detail.amountLabel}>
            {food.per100 ? "Ilość (gramy)" : `Liczba porcji${hasValidAmount && !food.per100 ? ` · ${displayWeightG} g` : ""}`}
          </Text>
          <View style={detail.amountRow}>
            <IconButton icon="minus" label="Zmniejsz ilość" onPress={() => changeAmount(-step)} />
            <View style={detail.amountCenter}>
              <TextInput
                style={detail.amountInput}
                value={amountInput}
                onChangeText={updateAmount}
                keyboardType="decimal-pad"
                selectTextOnFocus
                accessibilityLabel={food.per100 ? "Gramatura produktu" : "Liczba porcji"}
              />
              <Text style={detail.unit}>{food.per100 ? "g" : "×"}</Text>
            </View>
            <IconButton icon="plus" label="Zwiększ ilość" tone="accent" onPress={() => changeAmount(step)} />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Dodaj do ${section}`}
          disabled={!hasValidAmount}
          style={({ pressed }) => [ui.cta, !hasValidAmount && ui.disabled, pressed && hasValidAmount && ui.pressed]}
          onPress={() => onAdd(food, amount)}
        >
          <Text style={ui.ctaText}>Dodaj do {section}</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

function MacroTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={detail.macroTile}>
      <View style={[detail.macroLine, { backgroundColor: color }]} />
      <Text style={detail.macroValue}>{value}g</Text>
      <Text style={detail.macroLabel}>{label}</Text>
    </View>
  );
}

function MeasurementsView({ weights, profile, progressPhotos, onAddWeight, onAddPhoto, onDeletePhoto }: {
  weights: WeightEntry[];
  profile: ReturnType<typeof useUserProfile>["profile"];
  progressPhotos: ProgressPhoto[];
  onAddWeight: () => void;
  onAddPhoto: () => void;
  onDeletePhoto: (id: string) => Promise<void>;
}) {
  const current = weights.at(-1);
  const start = weights.at(0);
  const delta = current && start ? Number((current.weightKg - start.weightKg).toFixed(1)) : 0;

  return (
    <ScrollView contentContainerStyle={measure.scroll} showsVerticalScrollIndicator={false}>
      <View style={measure.header}>
        <Text style={measure.title}>Pomiary</Text>
        <IconButton icon="plus" label="Dodaj pomiar" tone="accent" onPress={onAddWeight} />
      </View>

      <View style={measure.card}>
        <View style={measure.cardTop}>
          <View>
            <Text style={measure.cardLabel}>Aktualna waga</Text>
            <View style={measure.currentRow}>
              <Text style={measure.currentValue}>{current ? current.weightKg.toFixed(1) : "-"}</Text>
              <Text style={measure.currentUnit}>kg</Text>
            </View>
            {current && start ? (
              <Text style={[measure.delta, { color: delta <= 0 ? colors.green : colors.danger }]}>
                {delta <= 0 ? "Spadek" : "Wzrost"} {Math.abs(delta)} kg od początku
              </Text>
            ) : (
              <Text style={measure.deltaMuted}>Dodaj pierwszy pomiar, aby zobaczyć trend</Text>
            )}
          </View>
          <Pressable style={({ pressed }) => [measure.addButton, pressed && ui.pressed]} onPress={onAddWeight}>
            <Icon name="plus" size={16} color={colors.warmBlack} />
            <Text style={measure.addButtonText}>Dodaj</Text>
          </Pressable>
        </View>
        <WeightTrendChart data={weights} />
      </View>

      <View style={measure.stats}>
        <StatCard label="Cel" value={profile?.targetWeightKg ? `${profile.targetWeightKg} kg` : "Brak"} color={colors.accent} />
        <StatCard label="Różnica" value={current && start ? `${delta} kg` : "-"} color={delta <= 0 ? colors.green : colors.danger} />
        <StatCard label="Pomiarów" value={String(weights.length)} color={colors.fat} />
      </View>

      <View style={measure.photoHeader}>
        <Text style={measure.photoTitle}>Zdjęcia postępu</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dodaj zdjęcie postępu"
          style={({ pressed }) => [measure.photoAdd, pressed && ui.pressed]}
          onPress={onAddPhoto}
        >
          <Icon name="camera" size={16} color={colors.accent} />
          <Text style={measure.photoAddText}>Dodaj</Text>
        </Pressable>
      </View>

      {progressPhotos.length > 0 ? (
        <View style={measure.photoGrid}>
          {progressPhotos.map((photo) => (
            <View key={photo.id} style={measure.photoCard}>
              <Image source={{ uri: photo.uri }} style={measure.photoImage} />
              <View style={measure.photoMeta}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={measure.photoAngle}>{angleLabel(photo.angle)}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Usuń zdjęcie ${angleLabel(photo.angle)}`}
                    style={({ pressed }) => [measure.photoDelete, pressed && ui.pressed]}
                    onPress={() => void onDeletePhoto(photo.id)}
                  >
                    <Icon name="x" size={13} color={colors.muted} />
                  </Pressable>
                </View>
                <Text style={measure.photoDate}>{formatShortDate(photo.createdAt)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Pressable style={({ pressed }) => [measure.emptyPhotos, pressed && ui.pressed]} onPress={onAddPhoto}>
          <Icon name="image" size={28} color={colors.mutedMid} />
          <Text style={measure.emptyPhotoTitle}>Dodaj pierwsze zdjęcie</Text>
          <Text style={measure.emptyPhotoText}>Front, bok albo tył. Wszystko zostaje lokalnie na urządzeniu.</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function WeightTrendChart({ data }: { data: WeightEntry[] }) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(360, width - 60);
  const chartHeight = 150;
  const pad = { top: 18, right: 18, bottom: 28, left: 34 };

  if (data.length === 0) {
    return (
      <View style={trend.empty}>
        <Icon name="bar-chart" size={28} color={colors.mutedMid} />
        <Text style={trend.emptyText}>Brak danych do wykresu</Text>
      </View>
    );
  }

  const values = data.map((item) => item.weightKg);
  const min = Math.min(...values) - 0.5;
  const max = Math.max(...values) + 0.5;
  const range = max - min || 1;
  const innerW = chartWidth - pad.left - pad.right;
  const innerH = chartHeight - pad.top - pad.bottom;
  const x = (index: number) => pad.left + (data.length === 1 ? innerW / 2 : (index / (data.length - 1)) * innerW);
  const y = (value: number) => pad.top + innerH - ((value - min) / range) * innerH;
  const points = data.map((item, index) => ({ x: x(index), y: y(item.weightKg), item }));
  const labels = points.filter((_, index) => index === 0 || index === points.length - 1 || index % 2 === 0);

  return (
    <View style={[trend.wrap, { height: chartHeight, width: chartWidth }]}>
      {[0.25, 0.5, 0.75].map((factor) => (
        <View
          key={factor}
          style={[
            trend.gridLine,
            {
              left: pad.left,
              top: pad.top + innerH * factor,
              width: innerW,
            },
          ]}
        />
      ))}

      {points.slice(0, -1).map((point, index) => (
        <TrendSegment key={`${point.item.id}-segment`} from={point} to={points[index + 1]} />
      ))}

      {points.map((point, index) => (
        <View
          key={point.item.id}
          style={[
            trend.dot,
            index === points.length - 1 && trend.dotLast,
            {
              left: point.x - (index === points.length - 1 ? 6 : 4),
              top: point.y - (index === points.length - 1 ? 6 : 4),
            },
          ]}
        />
      ))}

      {labels.map((point) => (
        <Text
          key={`${point.item.id}-label`}
          numberOfLines={1}
          style={[
            trend.axisLabel,
            {
              left: Math.max(0, Math.min(chartWidth - 58, point.x - 29)),
              top: chartHeight - 18,
            },
          ]}
        >
          {point.item.date}
        </Text>
      ))}
    </View>
  );
}

function TrendSegment({
  from,
  to,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = `${Math.atan2(dy, dx)}rad`;
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  return (
    <View
      style={[
        trend.segment,
        {
          left: midX - length / 2,
          top: midY - 1.5,
          transform: [{ rotate: angle }],
          width: length,
        },
      ]}
    />
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={measure.stat}>
      <Text style={measure.statLabel}>{label}</Text>
      <Text style={[measure.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function AddWeightSheet({ visible, onClose, onSave, lastWeight }: {
  visible: boolean;
  onClose: () => void;
  onSave: (kg: number) => void;
  lastWeight?: number;
}) {
  const defaultVal = lastWeight != null ? formatDecimal(lastWeight, 1) : "";
  const [value, setValue] = useState(defaultVal);

  useEffect(() => {
    if (visible) setValue(lastWeight != null ? formatDecimal(lastWeight, 1) : "");
  }, [visible, lastWeight]);

  const parsed = parseDecimal(value);
  const valid = Number.isFinite(parsed) && parsed >= 30 && parsed <= 250;
  const change = (delta: number) => {
    const base = Number.isFinite(parsed) ? parsed : (lastWeight ?? 80);
    setValue(formatDecimal(Math.min(250, Math.max(30, base + delta)), 1));
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Dodaj pomiar" height="42%">
      <View style={weightSheet.wrap}>
        <View style={weightSheet.valueRow}>
          <TextInput
            style={weightSheet.input}
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            selectTextOnFocus
            accessibilityLabel="Waga w kilogramach"
          />
          <Text style={weightSheet.unit}>kg</Text>
        </View>
        <View style={weightSheet.controls}>
          <Pressable style={({ pressed }) => [weightSheet.control, pressed && ui.pressed]} onPress={() => change(-0.1)}>
            <Icon name="minus" size={22} color={colors.text} />
          </Pressable>
          <Pressable style={({ pressed }) => [weightSheet.control, weightSheet.controlAccent, pressed && ui.pressed]} onPress={() => change(0.1)}>
            <Icon name="plus" size={22} color={colors.warmBlack} />
          </Pressable>
        </View>
        <Pressable disabled={!valid} style={({ pressed }) => [ui.cta, !valid && ui.disabled, pressed && valid && ui.pressed]} onPress={() => onSave(parsed)}>
          <Text style={ui.ctaText}>Zapisz pomiar</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

function AddProgressPhotoSheet({ visible, onClose, onSave, currentWeight }: {
  visible: boolean;
  onClose: () => void;
  onSave: (photo: ProgressPhoto) => Promise<void>;
  currentWeight?: number;
}) {
  const [angle, setAngle] = useState<ProgressPhotoAngle>("front");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (camera: boolean) => {
    setError(null);
    const permission = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Brak uprawnień do zdjęć.");
      return;
    }

    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (result.canceled) return;

    const asset = result.assets[0];
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

    setBusy(true);
    try {
      const uri = await persistProgressPhotoFile(asset.uri);
      await onSave({
        id,
        uri,
        angle,
        note: note.trim() || null,
        weightKg: currentWeight ?? null,
        createdAt: new Date(),
      });
      setNote("");
      setAngle("front");
      onClose();
    } catch {
      setError("Nie udało się zapisać zdjęcia.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Zdjęcie postępu" height="58%">
      <View style={photoSheet.wrap}>
        <Text style={photoSheet.label}>Ujęcie</Text>
        <View style={photoSheet.angles}>
          {(["front", "side", "back", "other"] as ProgressPhotoAngle[]).map((item) => {
            const active = angle === item;
            return (
              <Pressable key={item} style={({ pressed }) => [photoSheet.angle, active && photoSheet.angleActive, pressed && ui.pressed]} onPress={() => setAngle(item)}>
                <Text style={[photoSheet.angleText, active && photoSheet.angleTextActive]}>{angleLabel(item)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={photoSheet.label}>Notatka</Text>
        <TextInput
          style={photoSheet.note}
          value={note}
          onChangeText={setNote}
          placeholder="Opcjonalnie"
          placeholderTextColor={colors.muted}
          multiline
        />
        {error ? <Text style={photoSheet.error}>{error}</Text> : null}
        <View style={photoSheet.actions}>
          <Pressable disabled={busy} style={({ pressed }) => [ui.cta, busy && ui.disabled, pressed && !busy && ui.pressed]} onPress={() => void pick(true)}>
            <Icon name="camera" size={18} color={colors.warmBlack} />
            <Text style={ui.ctaText}>Aparat</Text>
          </Pressable>
          <Pressable disabled={busy} style={({ pressed }) => [photoSheet.secondary, busy && ui.disabled, pressed && !busy && ui.pressed]} onPress={() => void pick(false)}>
            <Icon name="image" size={18} color={colors.text} />
            <Text style={photoSheet.secondaryText}>Galeria</Text>
          </Pressable>
        </View>
      </View>
    </Sheet>
  );
}

function QuickAddSheet({ visible, section, onClose, onConfirm }: {
  visible: boolean;
  section: string;
  onClose: () => void;
  onConfirm: (food: FoodItem) => void;
}) {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [portionWeight, setPortionWeight] = useState("100");
  const valid = name.trim().length > 0 && Number.isFinite(parseDecimal(kcal));

  const reset = () => {
    setName(""); setKcal(""); setProtein(""); setCarbs(""); setFat(""); setPortionWeight("100");
  };

  const confirm = () => {
    const pw = parseDecimal(portionWeight);
    const portionWeightG = Number.isFinite(pw) && pw > 0 ? pw : 100;
    onConfirm({
      id: Date.now(),
      name: name.trim(),
      detail: `1 porcja · ${portionWeightG} g`,
      calories: parseDecimal(kcal) || 0,
      protein: parseDecimal(protein) || 0,
      carbs: parseDecimal(carbs) || 0,
      fat: parseDecimal(fat) || 0,
      per100: false,
      portionWeightG,
    });
    reset();
  };

  return (
    <Sheet visible={visible} onClose={() => { reset(); onClose(); }} title={`Jednorazowo → ${section}`} height="88%">
      <ScrollView contentContainerStyle={custom.scroll} keyboardShouldPersistTaps="handled">
        <Field label="Nazwa potrawy" value={name} onChangeText={setName} />
        <Field label="Gramatura porcji (g)" value={portionWeight} onChangeText={setPortionWeight} keyboardType="decimal-pad" />
        <Field label="Kalorie na porcję" value={kcal} onChangeText={setKcal} keyboardType="decimal-pad" featured />
        <Text style={custom.hint}>Makra na całą porcję</Text>
        <View style={custom.macroGrid}>
          <Field label="Białko (g)" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" compact />
          <Field label="Węgle (g)" value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" compact />
          <Field label="Tłuszcze (g)" value={fat} onChangeText={setFat} keyboardType="decimal-pad" compact />
        </View>
        <Pressable disabled={!valid} style={({ pressed }) => [ui.cta, !valid && ui.disabled, pressed && valid && ui.pressed]} onPress={confirm}>
          <Text style={ui.ctaText}>Dodaj do {section}</Text>
        </Pressable>
      </ScrollView>
    </Sheet>
  );
}

function CreateCustomSheet({ visible, onClose, onSave }: {
  visible: boolean;
  onClose: () => void;
  onSave: (food: FoodItem) => void;
}) {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [portionWeight, setPortionWeight] = useState("100");
  const valid = name.trim().length > 0 && Number.isFinite(parseDecimal(kcal));

  const save = () => {
    const pw = parseDecimal(portionWeight);
    const portionWeightG = Number.isFinite(pw) && pw > 0 ? pw : 100;
    onSave({
      id: Date.now(),
      name: name.trim(),
      detail: `1 porcja · ${portionWeightG} g`,
      calories: parseDecimal(kcal) || 0,
      protein: parseDecimal(protein) || 0,
      carbs: parseDecimal(carbs) || 0,
      fat: parseDecimal(fat) || 0,
      per100: false,
      portionWeightG,
      custom: true,
    });
    setName("");
    setKcal("");
    setProtein("");
    setCarbs("");
    setFat("");
    setPortionWeight("100");
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Nowy produkt" height="88%">
      <ScrollView contentContainerStyle={custom.scroll} keyboardShouldPersistTaps="handled">
        <Field label="Nazwa produktu" value={name} onChangeText={setName} />
        <Field label="Gramatura 1 porcji (g)" value={portionWeight} onChangeText={setPortionWeight} keyboardType="decimal-pad" />
        <Field label="Kalorie na porcję" value={kcal} onChangeText={setKcal} keyboardType="decimal-pad" featured />
        <Text style={custom.hint}>Makra na całą porcję</Text>
        <View style={custom.macroGrid}>
          <Field label="Białko (g)" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" compact />
          <Field label="Węgle (g)" value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" compact />
          <Field label="Tłuszcze (g)" value={fat} onChangeText={setFat} keyboardType="decimal-pad" compact />
        </View>
        <Pressable disabled={!valid} style={({ pressed }) => [ui.cta, !valid && ui.disabled, pressed && valid && ui.pressed]} onPress={save}>
          <Text style={ui.ctaText}>Zapisz produkt</Text>
        </Pressable>
      </ScrollView>
    </Sheet>
  );
}

function Field({ label, value, onChangeText, keyboardType = "default", compact, featured }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "decimal-pad";
  compact?: boolean;
  featured?: boolean;
}) {
  return (
    <View style={[custom.field, compact && { flex: 1 }]}>
      <Text style={custom.label}>{label}</Text>
      <TextInput
        style={[custom.input, compact && custom.inputCompact, featured && custom.inputFeatured]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder="0"
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

function BottomNav({ tab, setTab, insetBottom }: { tab: HomeTab; setTab: (tab: HomeTab) => void; insetBottom: number }) {
  const tabs: Array<{ id: HomeTab; label: string; icon: IconName }> = [
    { id: "diary", label: "Dziennik", icon: "clipboard" },
    { id: "history", label: "Historia", icon: "activity" },
    { id: "measurements", label: "Pomiary", icon: "bar-chart" },
  ];

  return (
    <View style={[nav.wrap, { paddingBottom: Math.max(insetBottom, 8) }]}>
      {tabs.map((item) => {
        const active = tab === item.id;
        return (
          <Pressable key={item.id} style={({ pressed }) => [nav.item, pressed && ui.pressed]} onPress={() => setTab(item.id)}>
            <View style={[nav.iconWrap, active && nav.iconWrapActive]}>
              <Icon name={item.icon} size={20} color={active ? colors.accent : colors.muted} />
            </View>
            <Text style={[nav.label, active && nav.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function angleLabel(angle: ProgressPhotoAngle) {
  const labels: Record<ProgressPhotoAngle, string> = {
    front: "Przód",
    side: "Bok",
    back: "Tył",
    other: "Inne",
  };
  return labels[angle];
}

function formatShortDate(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

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
  const lastAmountsRef = useRef<Map<string | number, string>>(new Map());

  // Reset dateOffset to 0 and refresh when app returns from background after midnight
  useEffect(() => {
    const lastDateKey = { current: todayDateKey() };
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        const newKey = todayDateKey();
        if (newKey !== lastDateKey.current) {
          lastDateKey.current = newKey;
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
      return () => {
        active = false;
      };
    }, [dateOffset, user]),
  );

  useEffect(() => {
    void AsyncStorage.getItem(WEIGHTS_KEY).then((value) => {
      if (!value) return;
      try {
        setWeights(JSON.parse(value) as WeightEntry[]);
      } catch {}
    });
    void getProgressPhotos().then(setProgressPhotos);
    void AsyncStorage.getItem(CUSTOM_PRODUCTS_KEY).then((value) => {
      if (!value) return;
      try {
        setCustomProducts(JSON.parse(value) as FoodItem[]);
      } catch {}
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
    const proteinPer100g = food.per100 ? food.protein : (pw > 0 ? (food.protein / pw) * 100 : 0);
    const carbsPer100g = food.per100 ? food.carbs : (pw > 0 ? (food.carbs / pw) * 100 : 0);
    const fatPer100g = food.per100 ? food.fat : (pw > 0 ? (food.fat / pw) * 100 : 0);
    await addMealRepo({
      userId: user.uid,
      name: food.name,
      weightG,
      proteinPer100g,
      carbsPer100g,
      fatPer100g,
      timestamp: dateWithOffset(dateOffset),
      source: food.code ? "barcode" : "manual",
      section,
      barcode: food.code ?? null,
      photoUrl: food.imageUrl ?? null,
    });
    setSelectedFood(null);
    setAddFoodSection(null);
    setRefreshKey((key) => key + 1);
  }, [addFoodSection, dateOffset, user]);

  const handleRemoveMeal = useCallback(async (id: string) => {
    if (!user) return;
    const date = dateWithOffset(dateOffset);
    const updated = meals.filter((meal) => meal.id !== id);
    await cacheMealsForDay(user.uid, date, updated);
    setMeals(updated);
  }, [dateOffset, meals, user]);

  const handleMoveMeal = useCallback(async (id: string, toSection: Section) => {
    if (!user) return;
    const date = dateWithOffset(dateOffset);
    const updated = meals.map((m) => m.id === id ? { ...m, section: toSection } : m);
    await cacheMealsForDay(user.uid, date, updated);
    setMeals(updated);
  }, [dateOffset, meals, user]);

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

  const currentWeight = weights.at(-1)?.weightKg;

  return (
    <View style={[home.wrap, { paddingTop: insets.top }]}>
      <View style={home.content}>
        {tab === "diary" ? (
          <DiaryView
            meals={meals}
            dateOffset={dateOffset}
            setDateOffset={setDateOffset}
            profile={profile}
            onAddFood={setAddFoodSection}
            onRemoveMeal={handleRemoveMeal}
            onMoveMeal={handleMoveMeal}
          />
        ) : tab === "history" ? (
          <HistoryScreen />
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

      <BottomNav tab={tab} setTab={setTab} insetBottom={insets.bottom} />

      <AddFoodSheet
        visible={addFoodSection !== null}
        section={addFoodSection ?? ""}
        uid={user?.uid ?? ""}
        onClose={() => setAddFoodSection(null)}
        onSelectFood={setSelectedFood}
        customProducts={customProducts}
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

      <AddWeightSheet visible={showAddWeight} onClose={() => setShowAddWeight(false)} onSave={handleAddWeight} lastWeight={currentWeight} />
      <AddProgressPhotoSheet
        visible={showAddPhoto}
        onClose={() => setShowAddPhoto(false)}
        onSave={handleSavePhoto}
        currentWeight={currentWeight}
      />
    </View>
  );
};

const ui = StyleSheet.create({
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.86 },
  disabled: { opacity: 0.45 },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  iconButtonAccent: {
    backgroundColor: colors.accentA,
    borderColor: colors.accentB,
  },
  cta: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    height: 52,
    justifyContent: "center",
  },
  ctaText: {
    ...typography.button,
    color: colors.warmBlack,
  },
});

const home = StyleSheet.create({
  wrap: { backgroundColor: colors.background, flex: 1 },
  content: { flex: 1 },
});

const sheet = StyleSheet.create({
  overlay: { backgroundColor: "rgba(0,0,0,0.68)", flex: 1, justifyContent: "flex-end" },
  surface: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  handle: { alignSelf: "center", backgroundColor: colors.borderMid, borderRadius: 2, height: 4, marginBottom: 8, marginTop: 12, width: 36 },
  titleRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingBottom: 14, paddingHorizontal: 20 },
  title: { ...typography.section, color: colors.text },
  close: { alignItems: "center", backgroundColor: colors.card, borderRadius: 10, height: 34, justifyContent: "center", width: 34 },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.86 },
});

const macro = StyleSheet.create({
  wrap: { marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  label: { ...typography.label, color: colors.mutedMid },
  value: { ...typography.label, color: colors.text },
  goal: { color: colors.muted },
  track: { backgroundColor: colors.border, borderRadius: 3, height: 6, overflow: "hidden" },
  fill: { borderRadius: 3, height: "100%" },
  dot: { width: 7, height: 7, borderRadius: 4 },
});

const diary = StyleSheet.create({
  scroll: { paddingBottom: 24, paddingHorizontal: 14 },
  dateRow: { alignItems: "center", flexDirection: "row", paddingVertical: 8 },
  dateRowRight: { flexDirection: "row", gap: 8 },
  dateCenter: { alignItems: "center", flex: 1 },
  dateLabel: { ...typography.section, color: colors.text },
  dateSub: { ...typography.label, color: colors.muted },
  todayPill: { ...typography.label, color: colors.accent, fontSize: 10, marginTop: 3 },
  summaryCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, marginBottom: 14, padding: 18 },
  cardLabel: { ...typography.label, color: colors.muted },
  kcalRow: { alignItems: "flex-end", flexDirection: "row", gap: 9, marginBottom: 10 },
  kcalBig: { ...typography.display, color: colors.text },
  kcalSide: { gap: 2, paddingBottom: 7 },
  kcalGoal: { ...typography.label, color: colors.muted },
  remaining: { ...typography.label },
  kcalTrack: { backgroundColor: colors.border, borderRadius: 3, height: 6, overflow: "hidden" },
  kcalFill: { borderRadius: 3, height: "100%" },
  macroStack: { marginTop: 16 },
  timeline: { paddingLeft: 4 },
  timelineRow: { flexDirection: "row", gap: 14 },
  spine: { alignItems: "center", width: 18 },
  dot: { borderRadius: 7, height: 13, marginTop: 6, width: 13 },
  line: { borderRadius: 1, flex: 1, marginTop: 5, minHeight: 30, width: 2 },
  section: { flex: 1, paddingBottom: 22 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  sectionTitleRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  sectionTitle: { ...typography.label, color: colors.text, fontSize: 14 },
  kcalPill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  kcalPillText: { ...typography.label, fontSize: 11 },
  foodList: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  foodRow: { alignItems: "center", flexDirection: "row", gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  foodBorder: { borderTopColor: colors.border, borderTopWidth: 1 },
  foodIcon: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 11, height: 38, justifyContent: "center", width: 38 },
  foodText: { flex: 1, minWidth: 0 },
  foodName: { ...typography.label, color: colors.text, fontSize: 13 },
  foodSub: { ...typography.label, color: colors.muted, fontSize: 11, marginTop: 2 },
  foodKcal: { ...typography.label, color: colors.mutedMid, fontSize: 12 },
  remove: { alignItems: "center", height: 32, justifyContent: "center", width: 26 },
  emptyFood: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderStyle: "dashed", borderWidth: 1.5, flexDirection: "row", gap: 8, paddingHorizontal: 13, paddingVertical: 10 },
  emptyFoodText: { ...typography.label, color: colors.muted },
});

const add = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 16 },
  searchRow: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 9, height: 48, marginBottom: 12, paddingHorizontal: 12 },
  searchInput: { ...typography.body, color: colors.text, flex: 1, paddingVertical: 0 },
  scanButton: { alignItems: "center", backgroundColor: colors.accentA, borderRadius: 10, height: 36, justifyContent: "center", width: 36 },
  quickGrid: { flexDirection: "row", gap: 8, marginBottom: 12 },
  quickTile: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flex: 1, gap: 5, minHeight: 54, justifyContent: "center" },
  quickLabel: { ...typography.label, color: colors.mutedMid },
  tabs: { flexDirection: "row", gap: 6, marginBottom: 12 },
  tab: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 11, borderWidth: 1, flex: 1, height: 34, justifyContent: "center" },
  tabActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { ...typography.label, color: colors.muted },
  tabTextActive: { color: colors.warmBlack },
  status: { ...typography.label, color: colors.mutedMid, marginBottom: 10 },
  createCustom: { alignItems: "center", backgroundColor: colors.accentA, borderColor: colors.accentB, borderRadius: 14, borderStyle: "dashed", borderWidth: 1.5, flexDirection: "row", gap: 10, marginBottom: 10, padding: 13 },
  createCustomText: { ...typography.label, color: colors.accent, fontSize: 13 },
  list: { flex: 1 },
  listContent: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  foodRow: { alignItems: "center", flexDirection: "row", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  foodPressed: { backgroundColor: colors.cardHov },
  foodBorder: { borderTopColor: colors.border, borderTopWidth: 1 },
  foodIcon: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 11, height: 38, justifyContent: "center", width: 38 },
  foodImage: { backgroundColor: colors.surface, borderRadius: 11, height: 38, width: 38 },
  foodText: { flex: 1, minWidth: 0 },
  foodName: { ...typography.label, color: colors.text, fontSize: 13 },
  foodDetail: { ...typography.label, color: colors.muted, fontSize: 11, marginTop: 2 },
  empty: { alignItems: "center", gap: 10, justifyContent: "center", minHeight: 140 },
  emptyText: { ...typography.label, color: colors.muted },
});

const detail = StyleSheet.create({
  wrap: { paddingBottom: 26, paddingHorizontal: 20 },
  header: { flexDirection: "row", gap: 14, marginBottom: 20 },
  headerIcon: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, height: 56, justifyContent: "center", width: 56 },
  image: { backgroundColor: colors.card, borderRadius: 16, height: 56, width: 56 },
  headerText: { flex: 1 },
  name: { ...typography.section, color: colors.text },
  sub: { ...typography.label, color: colors.muted, marginTop: 3 },
  accent: { color: colors.accent },
  kcalBlock: { alignItems: "center", marginBottom: 20 },
  kcal: { ...typography.display, color: colors.accent },
  kcalLabel: { ...typography.label, color: colors.muted },
  macros: { flexDirection: "row", gap: 8, marginBottom: 22 },
  macroTile: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flex: 1, gap: 5, padding: 10 },
  macroLine: { borderRadius: 2, height: 3, width: 22 },
  macroValue: { ...typography.label, color: colors.text, fontSize: 14 },
  macroLabel: { ...typography.label, color: colors.muted, fontSize: 10 },
  amountCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginBottom: 20, padding: 14 },
  amountLabel: { ...typography.label, color: colors.mutedMid, marginBottom: 8 },
  amountRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  amountCenter: { alignItems: "center", flex: 1, flexDirection: "row", justifyContent: "center" },
  amountInput: { ...typography.title, color: colors.text, minWidth: 84, paddingVertical: 0, textAlign: "center" },
  unit: { ...typography.label, color: colors.muted, marginLeft: 4 },
});

const measure = StyleSheet.create({
  scroll: { paddingBottom: 24, paddingHorizontal: 14, paddingTop: 10 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  title: { ...typography.title, color: colors.text },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, marginBottom: 12, padding: 16 },
  cardTop: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  cardLabel: { ...typography.label, color: colors.muted },
  currentRow: { alignItems: "baseline", flexDirection: "row", gap: 6, marginTop: 3 },
  currentValue: { ...typography.display, color: colors.text },
  currentUnit: { ...typography.body, color: colors.muted },
  delta: { ...typography.label, marginTop: 5 },
  deltaMuted: { ...typography.label, color: colors.muted, marginTop: 5 },
  addButton: { alignItems: "center", backgroundColor: colors.accent, borderRadius: 13, flexDirection: "row", gap: 6, height: 38, paddingHorizontal: 13 },
  addButtonText: { ...typography.label, color: colors.warmBlack },
  stats: { flexDirection: "row", gap: 10, marginBottom: 14 },
  stat: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flex: 1, padding: 12 },
  statLabel: { ...typography.label, color: colors.muted, fontSize: 10 },
  statValue: { ...typography.section, marginTop: 4 },
  photoHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  photoTitle: { ...typography.section, color: colors.text },
  photoAdd: { alignItems: "center", flexDirection: "row", gap: 6, minHeight: 40 },
  photoAddText: { ...typography.label, color: colors.accent },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, overflow: "hidden", width: "48%" },
  photoImage: { aspectRatio: 3 / 4, backgroundColor: colors.surface, width: "100%" },
  photoMeta: { padding: 10 },
  photoAngle: { ...typography.label, color: colors.text },
  photoDate: { ...typography.label, color: colors.muted, fontSize: 10, marginTop: 2 },
  photoDelete: { alignItems: "center", height: 24, justifyContent: "center", width: 24 },
  emptyPhotos: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderStyle: "dashed", borderWidth: 1.5, gap: 8, padding: 22 },
  emptyPhotoTitle: { ...typography.section, color: colors.text },
  emptyPhotoText: { ...typography.body, color: colors.muted, textAlign: "center" },
});

const trend = StyleSheet.create({
  wrap: { alignSelf: "center", overflow: "hidden", position: "relative" },
  empty: { alignItems: "center", gap: 8, height: 150, justifyContent: "center" },
  emptyText: { ...typography.label, color: colors.muted },
  gridLine: { backgroundColor: colors.border, height: 1, opacity: 0.85, position: "absolute" },
  segment: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 3,
    opacity: 0.92,
    position: "absolute",
  },
  dot: {
    backgroundColor: colors.card,
    borderColor: colors.accent,
    borderRadius: 999,
    borderWidth: 2,
    height: 8,
    position: "absolute",
    width: 8,
  },
  dotLast: {
    backgroundColor: colors.accent,
    height: 12,
    width: 12,
  },
  axisLabel: {
    ...typography.label,
    color: colors.muted,
    fontSize: 10,
    position: "absolute",
    textAlign: "center",
    width: 58,
  },
});

const weightSheet = StyleSheet.create({
  wrap: { gap: 20, paddingBottom: 28, paddingHorizontal: 20 },
  valueRow: { alignItems: "flex-end", flexDirection: "row", gap: 8, justifyContent: "center" },
  input: { ...typography.display, color: colors.text, minWidth: 150, paddingVertical: 0, textAlign: "center" },
  unit: { ...typography.section, color: colors.muted, paddingBottom: 7 },
  controls: { flexDirection: "row", gap: 14 },
  control: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flex: 1, height: 52, justifyContent: "center" },
  controlAccent: { backgroundColor: colors.accent, borderColor: colors.accent },
});

const photoSheet = StyleSheet.create({
  wrap: { gap: 12, paddingBottom: 24, paddingHorizontal: 20 },
  label: { ...typography.label, color: colors.mutedMid, textTransform: "uppercase" },
  angles: { flexDirection: "row", gap: 8 },
  angle: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flex: 1, height: 40, justifyContent: "center" },
  angleActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  angleText: { ...typography.label, color: colors.mutedMid },
  angleTextActive: { color: colors.warmBlack },
  note: { ...typography.body, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.text, minHeight: 84, padding: 12, textAlignVertical: "top" },
  error: { ...typography.label, color: colors.danger },
  actions: { gap: 10, marginTop: 4 },
  secondary: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 8, height: 52, justifyContent: "center" },
  secondaryText: { ...typography.button, color: colors.text },
});

const custom = StyleSheet.create({
  scroll: { gap: 16, paddingBottom: 32, paddingHorizontal: 20 },
  field: { gap: 7 },
  label: { ...typography.label, color: colors.mutedMid, textTransform: "uppercase" },
  input: { ...typography.body, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.text, minHeight: 50, paddingHorizontal: 14 },
  inputCompact: { fontSize: 18, textAlign: "center" },
  inputFeatured: { color: colors.accent, fontSize: 34, textAlign: "center" },
  macroGrid: { flexDirection: "row", gap: 10 },
  hint: { ...typography.label, color: colors.mutedMid, fontSize: 11, marginBottom: -8 },
});

const nav = StyleSheet.create({
  wrap: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", paddingTop: 8 },
  item: { alignItems: "center", flex: 1, gap: 4, justifyContent: "center" },
  iconWrap: { alignItems: "center", borderRadius: 14, height: 32, justifyContent: "center", width: 52 },
  iconWrapActive: { backgroundColor: colors.accentA },
  label: { ...typography.label, color: colors.muted, fontSize: 10 },
  labelActive: { color: colors.accent },
});
