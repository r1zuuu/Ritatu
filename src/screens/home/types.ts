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
  code?: string;
  imageUrl?: string | null;
};
