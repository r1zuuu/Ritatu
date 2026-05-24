import { Timestamp } from "firebase/firestore";
import type { MealEntry, MealEntryDocument, UserProfile } from "./types";

export const mealFromDoc = (data: MealEntryDocument): MealEntry => ({
  ...data,
  timestamp: data.timestamp.toDate(),
});

export const mealToDoc = (meal: MealEntry): MealEntryDocument => ({
  ...meal,
  timestamp: Timestamp.fromDate(meal.timestamp),
});

export const profileFromDoc = (data: Record<string, unknown>): UserProfile => ({
  uid: String(data.uid),
  email: String(data.email),
  displayName: (data.displayName as string | null | undefined) ?? null,
  weightKg: (data.weightKg as number | null | undefined) ?? null,
  heightCm: (data.heightCm as number | null | undefined) ?? null,
  age: (data.age as number | null | undefined) ?? null,
  gender: (data.gender as UserProfile["gender"] | null | undefined) ?? null,
  goalType: (data.goalType as UserProfile["goalType"] | null | undefined) ?? null,
  goalPace: (data.goalPace as UserProfile["goalPace"] | null | undefined) ?? null,
  activityLevel:
    (data.activityLevel as UserProfile["activityLevel"] | null | undefined) ?? null,
  targetDate:
    data.targetDate instanceof Timestamp ? data.targetDate.toDate() : null,
  goalKcal: (data.goalKcal as number | null | undefined) ?? null,
  goalProteinG: (data.goalProteinG as number | null | undefined) ?? null,
  goalCarbsG: (data.goalCarbsG as number | null | undefined) ?? null,
  goalFatG: (data.goalFatG as number | null | undefined) ?? null,
  onboardingDone: Boolean(data.onboardingDone),
});

export const profileToDoc = (profile: UserProfile) => ({
  ...profile,
  targetDate: profile.targetDate ? Timestamp.fromDate(profile.targetDate) : null,
});
