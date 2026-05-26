import type { OpenFoodFactsSearchItem } from "./openFoodFactsService";

const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";
// Free DEMO_KEY: 30 req/hour per IP. Get your own at https://fdc.nal.usda.gov/api-key-signup.html
const USDA_API_KEY = "DEMO_KEY";

const NUTRIENT_IDS = {
  kcal: 1008,
  protein: 1003,
  carbs: 1005,
  fat: 1004,
} as const;

type UsdaFoodNutrient = {
  nutrientId?: number;
  value?: number;
};

type UsdaFood = {
  fdcId?: number;
  description?: string;
  brandOwner?: string;
  dataType?: string;
  foodNutrients?: UsdaFoodNutrient[];
};

type UsdaSearchResponse = {
  foods?: UsdaFood[];
};

const getNutrient = (food: UsdaFood, id: number): number | null => {
  const found = food.foodNutrients?.find((n) => n.nutrientId === id);
  return typeof found?.value === "number" ? found.value : null;
};

export const searchUsdaProducts = async (
  query: string,
): Promise<OpenFoodFactsSearchItem[]> => {
  const params = new URLSearchParams({
    query,
    api_key: USDA_API_KEY,
    pageSize: "15",
    dataType: "Foundation,SR Legacy",
  });

  let response: Response;
  try {
    response = await fetch(`${USDA_BASE}/foods/search?${params.toString()}`);
  } catch {
    return [];
  }

  if (!response.ok) return [];

  const data = (await response.json()) as UsdaSearchResponse;

  return (data.foods ?? [])
    .map((food): OpenFoodFactsSearchItem | null => {
      const name = food.description?.trim();
      if (!food.fdcId || !name) return null;

      const kcal = getNutrient(food, NUTRIENT_IDS.kcal);
      const protein = getNutrient(food, NUTRIENT_IDS.protein);
      const carbs = getNutrient(food, NUTRIENT_IDS.carbs);
      const fat = getNutrient(food, NUTRIENT_IDS.fat);

      if (kcal === null || protein === null || carbs === null || fat === null) return null;

      const detail = food.brandOwner ? food.brandOwner : "100 g";

      return {
        code: `usda:${food.fdcId}`,
        name,
        detail,
        calories: Math.round(kcal),
        proteinPer100g: protein,
        carbsPer100g: carbs,
        fatPer100g: fat,
        imageUrl: null,
      };
    })
    .filter((item): item is OpenFoodFactsSearchItem => item !== null);
};
