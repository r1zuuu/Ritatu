export type LocalUser = {
  uid: string;
  email: string;
  displayName: string | null;
};

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
  section?: string | null;
  barcode?: string | null;
  photoUrl?: string | null;
};

export type WeightEntry = {
  id: string;
  date: string;
  weightKg: number;
};

export type ProgressPhotoAngle = "front" | "side" | "back" | "other";

export type ProgressPhoto = {
  id: string;
  uri: string;
  createdAt: Date;
  angle: ProgressPhotoAngle;
  note?: string | null;
  weightKg?: number | null;
};

export type DeveloperSettings = {
  mockBarcodeEnabled: boolean;
  mockPhotoAiEnabled: boolean;
  seededDemoDataAt?: Date | null;
};

export type MealDraft = {
  name: string;
  weightG: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  source: MealSource;
  section?: string | null;
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
  targetWeightKg?: number | null;
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
