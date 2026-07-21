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

const DAY_TEMPLATES: Array<Array<{ name: string; weightG: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number; section: string }>> = [
  [
    { name: "Owsianka z bananem", weightG: 300, proteinPer100g: 5.2, carbsPer100g: 18.4, fatPer100g: 2.1, section: "Śniadanie" },
    { name: "Kurczak z ryżem", weightG: 420, proteinPer100g: 12.8, carbsPer100g: 22.4, fatPer100g: 4.2, section: "Obiad" },
    { name: "Twaróg z rzodkiewką", weightG: 200, proteinPer100g: 17.4, carbsPer100g: 3.1, fatPer100g: 1.0, section: "Kolacja" },
  ],
  [
    { name: "Jajecznica z pomidorami", weightG: 250, proteinPer100g: 10.2, carbsPer100g: 2.8, fatPer100g: 8.6, section: "Śniadanie" },
    { name: "Makaron z łososiem", weightG: 380, proteinPer100g: 11.4, carbsPer100g: 20.1, fatPer100g: 7.3, section: "Obiad" },
    { name: "Jogurt z owocami", weightG: 280, proteinPer100g: 8.6, carbsPer100g: 11.2, fatPer100g: 3.1, section: "Przekąska" },
  ],
  [
    { name: "Kanapki z serem żółtym", weightG: 200, proteinPer100g: 14.2, carbsPer100g: 28.6, fatPer100g: 9.4, section: "Śniadanie" },
    { name: "Zupa pomidorowa z makaronem", weightG: 450, proteinPer100g: 4.1, carbsPer100g: 12.8, fatPer100g: 2.3, section: "Obiad" },
    { name: "Pierś z kurczaka z warzywami", weightG: 320, proteinPer100g: 24.6, carbsPer100g: 5.2, fatPer100g: 3.8, section: "Kolacja" },
  ],
  [
    { name: "Płatki owsiane z mlekiem", weightG: 350, proteinPer100g: 6.8, carbsPer100g: 22.1, fatPer100g: 3.4, section: "Śniadanie" },
    { name: "Gulasz wołowy z ziemniakami", weightG: 480, proteinPer100g: 13.2, carbsPer100g: 16.4, fatPer100g: 6.1, section: "Obiad" },
    { name: "Banan", weightG: 120, proteinPer100g: 1.1, carbsPer100g: 22.8, fatPer100g: 0.3, section: "Przekąska" },
  ],
  [
    { name: "Omlet z warzywami", weightG: 280, proteinPer100g: 12.4, carbsPer100g: 4.6, fatPer100g: 9.2, section: "Śniadanie" },
    { name: "Ryż z tuńczykiem i brokułem", weightG: 400, proteinPer100g: 14.8, carbsPer100g: 24.2, fatPer100g: 2.6, section: "Obiad" },
    { name: "Chleb żytni z awokado", weightG: 180, proteinPer100g: 4.2, carbsPer100g: 18.6, fatPer100g: 8.4, section: "Kolacja" },
  ],
  [
    { name: "Jogurt grecki z miodem", weightG: 250, proteinPer100g: 9.2, carbsPer100g: 8.4, fatPer100g: 4.1, section: "Śniadanie" },
    { name: "Schab pieczony z ziemniakami", weightG: 450, proteinPer100g: 18.6, carbsPer100g: 20.4, fatPer100g: 8.2, section: "Obiad" },
    { name: "Sałatka z twarogiem", weightG: 220, proteinPer100g: 14.2, carbsPer100g: 6.8, fatPer100g: 2.4, section: "Kolacja" },
  ],
  [
    { name: "Tosty z jajkiem sadzonym", weightG: 240, proteinPer100g: 11.8, carbsPer100g: 24.6, fatPer100g: 7.4, section: "Śniadanie" },
    { name: "Łosoś z warzywami", weightG: 360, proteinPer100g: 20.4, carbsPer100g: 8.2, fatPer100g: 13.6, section: "Obiad" },
    { name: "Ryż z jogurtem", weightG: 280, proteinPer100g: 6.4, carbsPer100g: 26.8, fatPer100g: 2.1, section: "Kolacja" },
  ],
];

export const seedDemoData = async (uid: string, profile: UserProfile | null): Promise<void> => {
  const now = new Date();
  const entries: [string, string][] = [];

  for (let i = 0; i < DAY_TEMPLATES.length; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateKey = toDateKey(date);
    const mealKey = `ritatu:meals:${uid}:${dateKey}`;
    const template = DAY_TEMPLATES[i];
    const meals: MealEntry[] = template.map((t, j) => ({
      id: `demo-d${i}-${j}`,
      userId: uid,
      name: t.name,
      weightG: t.weightG,
      proteinPer100g: t.proteinPer100g,
      carbsPer100g: t.carbsPer100g,
      fatPer100g: t.fatPer100g,
      timestamp: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8 + j * 4),
      source: "manual" as const,
      section: t.section,
      barcode: null,
      photoUrl: null,
    }));
    entries.push([mealKey, JSON.stringify(meals)]);
  }

  const weights: WeightEntry[] = [
    { id: "w1", date: "01.05", weightKg: 84.2 },
    { id: "w2", date: "08.05", weightKg: 83.5 },
    { id: "w3", date: "15.05", weightKg: 82.9 },
    { id: "w4", date: "24.05", weightKg: profile?.weightKg ?? 82.4 },
  ];

  entries.push([WEIGHTS_KEY, JSON.stringify(weights)]);
  entries.push(["ritatu:progress-photos", JSON.stringify([])]);

  await AsyncStorage.multiSet(entries);

  await saveDeveloperSettings({
    ...(await getDeveloperSettings()),
    seededDemoDataAt: new Date(),
  });
};
