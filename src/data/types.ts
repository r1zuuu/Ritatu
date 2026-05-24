import type { Timestamp } from "firebase/firestore";

export type MealSource = "barcode" | "photo" | "manual";
export type Gender = "male" | "female";
export type GoalType = "lose" | "maintain" | "gain";
export type GoalPace = "slow" | "moderate" | "fast";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";
export type Confidence = "low" | "medium" | "high";

export type MealEntry = {
  id: string;
  userId: string;
  name: string;
  weightG: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  timestamp: Date;
  source: MealSource;
  barcode?: string | null;
  photoUrl?: string | null;
};

export type MealEntryDocument = Omit<MealEntry, "timestamp"> & {
  timestamp: Timestamp;
};

export type MealDraft = {
  name: string;
  weightG: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  source: MealSource;
  barcode?: string | null;
  photoUrl?: string | null;
  note?: string | null;
  confidence?: Confidence;
};

export type DaySummary = {
  dateKey: string;
  meals: MealEntry[];
};

export type UserProfile = {
  uid: string;
  email: string;
  displayName?: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  age?: number | null;
  gender?: Gender | null;
  goalType?: GoalType | null;
  goalPace?: GoalPace | null;
  activityLevel?: ActivityLevel | null;
  targetDate?: Date | null;
  goalKcal?: number | null;
  goalProteinG?: number | null;
  goalCarbsG?: number | null;
  goalFatG?: number | null;
  onboardingDone: boolean;
};

export type MacroGoals = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type MealMacros = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type DateValidationResult = {
  isRealistic: boolean;
  realisticDate: Date;
  estimatedChangeKg: number;
};

export type VisionMealResult = {
  dish_name: string;
  estimated_weight_g: number;
  confidence: Confidence;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  note: string | null;
};
