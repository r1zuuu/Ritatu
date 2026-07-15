import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { summarizeMeals } from "../core/macroCalculator";
import {
  addMeal as addMealToRepository,
  getCachedMealsForDay,
  watchMealsForDay,
} from "../data/mealRepository";
import type { MealDraft, MealEntry, MealMacros } from "../data/types";
import { useAuth } from "./AuthProvider";

type MealsContextValue = {
  meals: MealEntry[];
  totals: MealMacros;
  loading: boolean;
  error: string | null;
  addMeal: (draft: MealDraft) => Promise<void>;
  refreshFromCache: () => Promise<void>;
};

const MealsContext = createContext<MealsContextValue | null>(null);

const today = () => new Date();

export const MealsProvider = ({ children }: PropsWithChildren) => {
  const { user } = useAuth();
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshFromCache = useCallback(async () => {
    if (!user) return;
    const cached = await getCachedMealsForDay(user.uid, today());
    setMeals(cached);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setMeals([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    void refreshFromCache();

    return watchMealsForDay(
      user.uid,
      today(),
      (nextMeals) => {
        setMeals(nextMeals);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, [refreshFromCache, user]);

  const addMeal = useCallback(
    async (draft: MealDraft) => {
      if (!user) throw new Error("Musisz być zalogowany.");

      setError(null);
      await addMealToRepository({
        userId: user.uid,
        name: draft.name.trim(),
        weightG: draft.weightG,
        proteinPer100g: draft.proteinPer100g,
        carbsPer100g: draft.carbsPer100g,
        fatPer100g: draft.fatPer100g,
        timestamp: new Date(),
        source: draft.source,
        section: draft.section ?? null,
        barcode: draft.barcode ?? null,
        photoUrl: draft.photoUrl ?? null,
        note: draft.note ?? null,
        confidence: draft.confidence,
      });
      const nextMeals = await getCachedMealsForDay(user.uid, today());
      setMeals(nextMeals);
    },
    [user],
  );

  const totals = useMemo(() => summarizeMeals(meals), [meals]);

  const value = useMemo(
    () => ({
      meals,
      totals,
      loading,
      error,
      addMeal,
      refreshFromCache,
    }),
    [addMeal, error, loading, meals, refreshFromCache, totals],
  );

  return <MealsContext.Provider value={value}>{children}</MealsContext.Provider>;
};

export const useMeals = () => {
  const context = useContext(MealsContext);
  if (!context) throw new Error("useMeals must be used inside MealsProvider");
  return context;
};
