import type { MealDraft } from "../data/types";

const OPEN_FOOD_FACTS_BASE_URL = "https://pl.openfoodfacts.org";
const PRODUCT_FIELDS = ["code", "product_name", "nutriments", "image_front_url"].join(",");
const SEARCH_FIELDS = [
  "code",
  "product_name",
  "brands",
  "quantity",
  "nutriments",
  "image_front_url",
].join(",");
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

type OpenFoodFactsSearchProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  quantity?: string;
  image_front_url?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
};

type OpenFoodFactsSearchResponse = {
  products?: OpenFoodFactsSearchProduct[];
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

export type OpenFoodFactsSearchItem = {
  code: string;
  name: string;
  detail: string;
  calories: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  imageUrl?: string | null;
};

const productToSearchItem = (
  product: OpenFoodFactsSearchProduct,
): OpenFoodFactsSearchItem | null => {
  const name = product.product_name?.trim();
  const nutriments = product.nutriments;
  const calories = nutriments?.["energy-kcal_100g"];
  const protein = nutriments?.proteins_100g;
  const carbs = nutriments?.carbohydrates_100g;
  const fat = nutriments?.fat_100g;

  if (
    !product.code ||
    !name ||
    !isNumber(calories) ||
    !isNumber(protein) ||
    !isNumber(carbs) ||
    !isNumber(fat)
  ) {
    return null;
  }

  const detailParts = [product.quantity, product.brands].filter(Boolean);

  return {
    code: product.code,
    name,
    detail: detailParts.length > 0 ? detailParts.join(" · ") : "100 g",
    calories,
    proteinPer100g: protein,
    carbsPer100g: carbs,
    fatPer100g: fat,
    imageUrl: product.image_front_url ?? null,
  };
};

export const searchProductsByName = async (
  query: string,
): Promise<OpenFoodFactsSearchItem[]> => {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const params = new URLSearchParams({
    search_terms: trimmed,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "20",
    fields: SEARCH_FIELDS,
  });

  let response: Response;

  try {
    response = await fetch(`${OPEN_FOOD_FACTS_BASE_URL}/cgi/search.pl?${params.toString()}`, {
      headers: {
        // RN/Expo native can pass User-Agent; web targets may ignore it.
        "User-Agent": USER_AGENT,
      },
    });
  } catch {
    throw new Error("Nie udało się połączyć z Open Food Facts.");
  }

  if (!response.ok) {
    throw new Error("Open Food Facts nie odpowiedziało poprawnie.");
  }

  const data = (await response.json()) as OpenFoodFactsSearchResponse;
  return (data.products ?? [])
    .map(productToSearchItem)
    .filter((item): item is OpenFoodFactsSearchItem => Boolean(item));
};

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
