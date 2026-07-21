import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { toDateKey } from "../core/date";
import { GOAL_MET_RATIO, calculateMealMacros, round, summarizeMeals } from "../core/macroCalculator";
import { parseMeals } from "./mealRepository";
import { getUserProfile } from "./userRepository";
import { getWeights } from "./weightRepository";
import type { MealEntry } from "./types";

// Excel only reads UTF-8 correctly when the file starts with a BOM. Built with
// fromCharCode so it stays visible in the source: a literal BOM is invisible and
// one stray reformat would silently break the encoding.
const BOM = String.fromCharCode(0xfeff);

// Storage keys already end in the date, so grouping needs no date parsing.
const readMealsByDate = async (uid: string): Promise<Map<string, MealEntry[]>> => {
  const prefix = `ritatu:meals:${uid}:`;
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(prefix));
  const stored = await AsyncStorage.multiGet(keys);
  return new Map(
    stored
      .map(([key, value]) => [key.slice(prefix.length), parseMeals(value)] as const)
      .filter(([, meals]) => meals.length > 0),
  );
};

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

// CRLF per RFC 4180, which is also what Excel expects.
const csvFile = (header: string, rows: string[]) => BOM + [header, ...rows].join("\r\n");

/* ── Meals: one row per meal ─────────────────────────────────────────── */

// Polish headers on purpose: this is content for a human opening the file in
// Excel, and the `sekcja` values ("Śniadanie", "Obiad") are Polish anyway.
const MEALS_HEADER = [
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

const timeOfDay = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

const toMealRow = (meal: MealEntry) => {
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
  const meals = [...(await readMealsByDate(uid)).values()]
    .flat()
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return csvFile(MEALS_HEADER, meals.map(toMealRow));
};

/* ── Days: one row per day, with goals and weight ────────────────────── */

const DAYS_HEADER = [
  "data",
  "kcal",
  "cel kcal",
  "% celu kcal",
  "cel osiągnięty",
  "białko [g]",
  "cel białka [g]",
  "węglowodany [g]",
  "cel węglowodanów [g]",
  "tłuszcz [g]",
  "cel tłuszczu [g]",
  "waga [kg]",
  "liczba posiłków",
].join(";");

// An empty cell means "not recorded". Zero would claim the goal itself was zero.
const goalCell = (goal: number | null | undefined) =>
  typeof goal === "number" && goal > 0 ? num(goal, 0) : "";

export const buildDaysCsv = async (uid: string): Promise<string> => {
  const [mealsByDate, weights, profile] = await Promise.all([
    readMealsByDate(uid),
    getWeights(),
    getUserProfile(),
  ]);
  const weightByDate = new Map(weights.map((entry) => [entry.date, entry.weightKg]));
  const goalKcal = profile?.goalKcal ?? null;

  // A day with only a weigh-in still deserves a row, so union both sources.
  // Both key sets are ISO dates, which sort lexicographically.
  const dates = [...new Set([...mealsByDate.keys(), ...weightByDate.keys()])].sort((a, b) =>
    a.localeCompare(b),
  );

  const rows = dates.map((date) => {
    const meals = mealsByDate.get(date) ?? [];
    const totals = meals.length > 0 ? summarizeMeals(meals) : null;
    const weight = weightByDate.get(date);

    return [
      date,
      totals ? num(totals.kcal, 0) : "",
      goalCell(goalKcal),
      totals && goalKcal ? num((totals.kcal / goalKcal) * 100, 0) : "",
      totals && goalKcal ? (totals.kcal >= goalKcal * GOAL_MET_RATIO ? "tak" : "nie") : "",
      totals ? num(totals.proteinG) : "",
      goalCell(profile?.goalProteinG),
      totals ? num(totals.carbsG) : "",
      goalCell(profile?.goalCarbsG),
      totals ? num(totals.fatG) : "",
      goalCell(profile?.goalFatG),
      weight === undefined ? "" : num(weight),
      String(meals.length),
    ].join(";");
  });

  return csvFile(DAYS_HEADER, rows);
};

/* ── Sharing ─────────────────────────────────────────────────────────── */

type ShareResult = "shared" | "unavailable";

const shareCsv = async (
  name: string,
  dialogTitle: string,
  build: () => Promise<string>,
): Promise<ShareResult> => {
  // ponytail: web can't share local files by URI, so bail before writing one.
  if (!(await Sharing.isAvailableAsync())) return "unavailable";

  // Paths.document, not Paths.cache: the system may evict cache mid-share.
  const file = new File(Paths.document, `ritatu-${name}-${toDateKey(new Date())}.csv`);
  file.create({ overwrite: true });
  file.write(await build());

  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    dialogTitle,
    UTI: "public.comma-separated-values-text",
  });
  return "shared";
};

export const exportMealsCsv = (uid: string): Promise<ShareResult> =>
  shareCsv("posilki", "Eksport posiłków", () => buildMealsCsv(uid));

export const exportDaysCsv = (uid: string): Promise<ShareResult> =>
  shareCsv("dni", "Eksport dni", () => buildDaysCsv(uid));
