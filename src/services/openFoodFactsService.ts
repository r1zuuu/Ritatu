import type { MealDraft } from "../data/types";

const OPEN_FOOD_FACTS_BASE_URL = "https://world.openfoodfacts.org";
const PRODUCT_FIELDS = ["code", "product_name", "nutriments", "image_front_url"].join(",");
const USER_AGENT = "Ritatu/1.0 (contact: ritatu-app-local)";

type OpenFoodFactsProduct = {
  code?: string;
  status?: number;
  status_verbose?: string;
  product?: {
    code?: string;
    product_name?: string;
    image_front_url?: string;
    nutriments?: {
      "energy-kcal_100g"?: number;
      proteins_100g?: number;
      carbohydrates_100g?: number;
      fat_100g?: number;
    };
  };
};

export type ProductLookupResult =
  | { ok: true; status: "found"; draft: MealDraft; warning?: string }
  | {
      ok: false;
      status: "not_found" | "incomplete" | "network_error";
      warning: string;
      barcode: string;
    };

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const lookupProductByBarcode = async (
  barcode: string,
): Promise<ProductLookupResult> => {
  const url = `${OPEN_FOOD_FACTS_BASE_URL}/api/v2/product/${encodeURIComponent(
    barcode,
  )}.json?fields=${encodeURIComponent(PRODUCT_FIELDS)}`;

  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        // Browsers can block User-Agent, but native Expo targets can pass it through.
        "User-Agent": USER_AGENT,
      },
    });
  } catch {
    return {
      ok: false,
      status: "network_error",
      barcode,
      warning: "Nie udalo sie polaczyc z Open Food Facts. Sprobuj ponownie albo wpisz recznie.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: "network_error",
      barcode,
      warning: "Open Food Facts nie odpowiedzialo poprawnie. Sprobuj ponownie albo wpisz recznie.",
    };
  }

  const data = (await response.json()) as OpenFoodFactsProduct;

  if (data.status === 0 || !data.product) {
    return {
      ok: false,
      status: "not_found",
      barcode,
      warning: "Nie znaleziono produktu. Mozesz wpisac makro recznie.",
    };
  }

  const product = data.product;
  const nutriments = product.nutriments;

  const name = product.product_name?.trim();
  const protein = nutriments?.proteins_100g;
  const carbs = nutriments?.carbohydrates_100g;
  const fat = nutriments?.fat_100g;

  if (data.status !== 1 || !name || !isNumber(protein) || !isNumber(carbs) || !isNumber(fat)) {
    return {
      ok: false,
      status: "incomplete",
      barcode,
      warning: "Produkt ma niekompletne dane makro. Uzupelnij je recznie.",
    };
  }

  return {
    ok: true,
    status: "found",
    draft: {
      name,
      weightG: 100,
      proteinPer100g: protein,
      carbsPer100g: carbs,
      fatPer100g: fat,
      source: "barcode",
      barcode: product.code ?? data.code ?? barcode,
      photoUrl: product.image_front_url ?? null,
    },
  };
};
