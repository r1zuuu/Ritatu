import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { dateWithOffset, formatDayLabel, toDateKey } from "../core/date";
import { calculateMealMacros } from "../core/macroCalculator";
import { isSection, SECTION_GENITIVE } from "../core/section";
import { useToast } from "../components/Toast";
import { addMeal as addMealToRepository } from "../data/mealRepository";
import type { MealDraft } from "../data/types";
import { useAuth } from "./AuthProvider";

type MealsContextValue = {
  // Day the diary shows, in days relative to today. It lives here, not in the
  // diary screen, so every add path (search, scanner, photo, FAB) saves to it.
  dateOffset: number;
  setDateOffset: (offset: number) => void;
  selectedDate: Date;
  addMeal: (draft: MealDraft) => Promise<void>;
};

const MealsContext = createContext<MealsContextValue | null>(null);

export const MealsProvider = ({ children }: PropsWithChildren) => {
  const { user } = useAuth();
  const toast = useToast();
  const [dateOffset, setDateOffset] = useState(0);
  const [todayKey, setTodayKey] = useState(() => toDateKey(new Date()));
  const todayRef = useRef(todayKey);

  // Back from the background after midnight: jump to the new "today" instead of
  // showing yesterday under the "Dziś" label.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      const key = toDateKey(new Date());
      if (key === todayRef.current) return;
      todayRef.current = key;
      setTodayKey(key);
      setDateOffset(0);
    });
    return () => sub.remove();
  }, []);

  // todayKey is a dependency on purpose: after midnight "offset 0" is a new date.
  const selectedDate = useMemo(() => dateWithOffset(dateOffset), [dateOffset, todayKey]);

  const addMeal = useCallback(
    async (draft: MealDraft) => {
      if (!user) throw new Error("Musisz być zalogowany.");
      await addMealToRepository({
        userId: user.uid,
        name: draft.name.trim(),
        weightG: draft.weightG,
        proteinPer100g: draft.proteinPer100g,
        carbsPer100g: draft.carbsPer100g,
        fatPer100g: draft.fatPer100g,
        kcalPer100g: draft.kcalPer100g ?? null,
        // Selected day, current time of day, so meals still sort sensibly.
        timestamp: dateWithOffset(dateOffset),
        source: draft.source,
        section: draft.section ?? null,
        barcode: draft.barcode ?? null,
        photoUrl: draft.photoUrl ?? null,
        note: draft.note ?? null,
        confidence: draft.confidence,
      });
      // One confirmation for every add path; names the day when it is not today.
      const parts = [
        isSection(draft.section) ? `Dodano do ${SECTION_GENITIVE[draft.section]}` : "Dodano",
        `${Math.round(calculateMealMacros(draft, draft.weightG).kcal)} kcal`,
      ];
      if (dateOffset !== 0) parts.push(formatDayLabel(dateOffset, dateWithOffset(dateOffset)).toLowerCase());
      toast({ message: parts.join(" · ") });
    },
    [dateOffset, toast, user],
  );

  const value = useMemo(
    () => ({ dateOffset, setDateOffset, selectedDate, addMeal }),
    [addMeal, dateOffset, selectedDate],
  );

  return <MealsContext.Provider value={value}>{children}</MealsContext.Provider>;
};

export const useMeals = () => {
  const context = useContext(MealsContext);
  if (!context) throw new Error("useMeals must be used inside MealsProvider");
  return context;
};
