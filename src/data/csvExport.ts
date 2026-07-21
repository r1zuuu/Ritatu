import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { toDateKey } from "../core/date";
import { calculateMealMacros, round } from "../core/macroCalculator";
import { parseMeals } from "./mealRepository";
import type { MealEntry } from "./types";

// Polish headers on purpose: this is content for a human opening the file in
// Excel, and the `sekcja` values ("Śniadanie", "Obiad") are Polish anyway.
const HEADER = [
  "data",
  "godzina",
  "posiłek",
  "sekcja",
  "źródło",
  "waga [g]",
  "kcal",
  "białko [g]",
  "węglowodany [g]",
  "tłuszcz [g]",
  "kcal/100g",
  "białko/100g",
  "węglowodany/100g",
  "tłuszcz/100g",
  "kod kreskowy",
  "notatka",
].join(";");

const cell = (value: string | null | undefined) => {
  const text = value == null ? "" : String(value);
  // Excel treats a leading = + - @ as a formula. Product names arrive from Open
  // Food Facts, which anyone can edit, so neutralise them before they reach a
  // spreadsheet. Only text fields go through here, never the numeric columns.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  // RFC 4180: quote only when the value could break the row, double inner quotes.
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

// Polish Excel reads "15,6" as a number and "15.6" as text.
const num = (value: number, places = 1) => round(value, places).toString().replace(".", ",");

const timeOfDay = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

const toRow = (meal: MealEntry) => {
  // Both scalings go through calculateMealMacros so the per-100g columns follow
  // the same kcalPer100g-over-4/4/9 rule as the totals and as the app itself.
  const total = calculateMealMacros(meal, meal.weightG);
  const per100g = calculateMealMacros(meal, 100);

  return [
    toDateKey(meal.timestamp),
    timeOfDay(meal.timestamp),
    cell(meal.name),
    cell(meal.section),
    cell(meal.source),
    num(meal.weightG, 0),
    num(total.kcal, 0),
    num(total.proteinG),
    num(total.carbsG),
    num(total.fatG),
    num(per100g.kcal, 0),
    num(per100g.proteinG),
    num(per100g.carbsG),
    num(per100g.fatG),
    cell(meal.barcode),
    cell(meal.note),
  ].join(";");
};

export const buildMealsCsv = async (uid: string): Promise<string> => {
  const keys = await AsyncStorage.getAllKeys();
  const mealKeys = keys.filter((key) => key.startsWith(`ritatu:meals:${uid}:`));
  const stored = await AsyncStorage.multiGet(mealKeys);

  const meals = stored
    .flatMap(([, value]) => parseMeals(value))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // BOM as an escape on purpose: a literal one is invisible in the source and a
  // stray reformat would silently break Excel's encoding guess. CRLF per RFC 4180.
  return `\uFEFF${[HEADER, ...meals.map(toRow)].join("\r\n")}`;
};

export const exportMealsCsv = async (uid: string): Promise<"shared" | "unavailable"> => {
  // ponytail: web can't share local files by URI, so bail before writing one.
  if (!(await Sharing.isAvailableAsync())) return "unavailable";

  // Paths.document, not Paths.cache: the system may evict cache mid-share.
  const file = new File(Paths.document, `ritatu-posilki-${toDateKey(new Date())}.csv`);
  file.create({ overwrite: true });
  file.write(await buildMealsCsv(uid));

  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    dialogTitle: "Eksport posiłków",
    UTI: "public.comma-separated-values-text",
  });
  return "shared";
};
