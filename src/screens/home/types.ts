export type FoodItem = {
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
  oneTime?: boolean;
  code?: string;
  imageUrl?: string | null;
  // Favorites remember the usual amount (grams, or portions when !per100).
  defaultAmount?: number;
};
