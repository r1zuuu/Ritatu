import AsyncStorage from "@react-native-async-storage/async-storage";
import { toDateKey } from "../core/date";
import type { DeveloperSettings, MealEntry, ProgressPhoto, UserProfile, WeightEntry } from "./types";

export const DEV_SETTINGS_KEY = "ritatu:dev-settings";
export const WEIGHTS_KEY = "ritatu:weights";
export const CUSTOM_PRODUCTS_KEY = "ritatu:custom-products";

const DEFAULT_DEV_SETTINGS: DeveloperSettings = {
  mockBarcodeEnabled: false,
  mockPhotoAiEnabled: false,
  seededDemoDataAt: null,
};

const parseSettings = (value: string | null): DeveloperSettings => {
  if (!value) return DEFAULT_DEV_SETTINGS;
  try {
    const parsed = JSON.parse(value) as DeveloperSettings & { seededDemoDataAt?: string | null };
    return {
      mockBarcodeEnabled: Boolean(parsed.mockBarcodeEnabled),
      mockPhotoAiEnabled: Boolean(parsed.mockPhotoAiEnabled),
      seededDemoDataAt: parsed.seededDemoDataAt ? new Date(parsed.seededDemoDataAt) : null,
    };
  } catch {
    return DEFAULT_DEV_SETTINGS;
  }
};

export const getDeveloperSettings = async (): Promise<DeveloperSettings> =>
  parseSettings(await AsyncStorage.getItem(DEV_SETTINGS_KEY));

export const saveDeveloperSettings = async (settings: DeveloperSettings): Promise<void> => {
  await AsyncStorage.setItem(DEV_SETTINGS_KEY, JSON.stringify(settings));
};

export const exportLocalData = async (): Promise<string> => {
  const keys = await AsyncStorage.getAllKeys();
  const ritatuKeys = keys.filter((key) => key.startsWith("ritatu:"));
  const entries = await AsyncStorage.multiGet(ritatuKeys);
  return JSON.stringify(Object.fromEntries(entries), null, 2);
};

export const clearLocalAppData = async (): Promise<void> => {
  const keys = await AsyncStorage.getAllKeys();
  const ritatuKeys = keys.filter((key) => key.startsWith("ritatu:") && key !== "ritatu:auth:loggedIn");
  if (ritatuKeys.length > 0) await AsyncStorage.multiRemove(ritatuKeys);
};

export const seedDemoData = async (uid: string, profile: UserProfile | null): Promise<void> => {
  const now = new Date();
  const dateKey = toDateKey(now);
  const mealKey = `ritatu:meals:${uid}:${dateKey}`;
  const demoMeals: MealEntry[] = [
    {
      id: "demo-breakfast",
      userId: uid,
      name: "Jogurt grecki z owocami",
      weightG: 280,
      proteinPer100g: 8.6,
      carbsPer100g: 11.2,
      fatPer100g: 3.1,
      timestamp: now,
      source: "manual",
      section: "Śniadanie",
    },
    {
      id: "demo-lunch",
      userId: uid,
      name: "Kurczak z ryżem",
      weightG: 420,
      proteinPer100g: 12.8,
      carbsPer100g: 22.4,
      fatPer100g: 4.2,
      timestamp: now,
      source: "manual",
      section: "Obiad",
    },
  ];
  const weights: WeightEntry[] = [
    { id: "w1", date: "01.05", weightKg: 84.2 },
    { id: "w2", date: "08.05", weightKg: 83.5 },
    { id: "w3", date: "15.05", weightKg: 82.9 },
    { id: "w4", date: "24.05", weightKg: profile?.weightKg ?? 82.4 },
  ];
  const photos: ProgressPhoto[] = [];

  await AsyncStorage.multiSet([
    [mealKey, JSON.stringify(demoMeals)],
    [WEIGHTS_KEY, JSON.stringify(weights)],
    ["ritatu:progress-photos", JSON.stringify(photos)],
  ]);

  await saveDeveloperSettings({
    ...(await getDeveloperSettings()),
    seededDemoDataAt: new Date(),
  });
};
