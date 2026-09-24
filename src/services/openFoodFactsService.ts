import { Platform } from "react-native";
import type { MealDraft } from "../data/types";
import { env } from "../config/env";

const OFF_URL = "https://world.openfoodfacts.org";
// New search index — replaces the deprecated /cgi/search.pl (which now 503s)
const OFF_SEARCH_URL = "https://search.openfoodfacts.org/search";
const PRODUCT_FIELDS = ["code", "product_name", "nutriments", "image_front_url"].join(",");
const SEARCH_FIELDS = [
  "code",
  "product_name",
  "brands",
  "quantity",
  "nutriments",
  "image_front_url",
].join(",");
const USER_AGENT = "Ritatu/1.0 (contact: social@chmstudio.pl)";

function offHeaders(): HeadersInit {
  const h: HeadersInit = { "User-Agent": USER_AGENT };
  if (env.offUsername && env.offPassword) {
    h["Authorization"] = "Basic " + btoa(`${env.offUsername}:${env.offPassword}`);
  }
  return h;
}

type OffNutriments = {
  "energy-kcal_100g"?: number;
  "energy_100g"?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
};

type OpenFoodFactsProduct = {
  code?: string;
  status?: number;
  status_verbose?: string;
  product?: {
    code?: string;
    product_name?: string;
    image_front_url?: string;
    nutriments?: OffNutriments;
  };
};

type OpenFoodFactsSearchProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  quantity?: string;
  image_front_url?: string;
  nutriments?: OffNutriments;
};

// search-a-licious returns { count, hits: [...] } — not the legacy { products: [...] }
type OpenFoodFactsSearchResponse = {
  hits?: OpenFoodFactsSearchProduct[];
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

const resolveKcal = (n?: OffNutriments): number | null => {
  if (isNumber(n?.["energy-kcal_100g"])) return n!["energy-kcal_100g"]!;
  if (isNumber(n?.["energy_100g"])) return Math.round(n!["energy_100g"]! / 4.184);
  return null;
};

const productToSearchItem = (
  product: OpenFoodFactsSearchProduct,
): OpenFoodFactsSearchItem | null => {
  const name = product.product_name?.trim();
  const nutriments = product.nutriments;
  const calories = resolveKcal(nutriments);

  // Need at minimum: code, name, calories
  if (!product.code || !name || calories === null) return null;

  const detailParts = [product.quantity, product.brands].filter(Boolean);

  return {
    code: product.code,
    name,
    detail: detailParts.length > 0 ? detailParts.join(" · ") : "100 g",
    calories,
    proteinPer100g: nutriments?.proteins_100g ?? 0,
    carbsPer100g:   nutriments?.carbohydrates_100g ?? 0,
    fatPer100g:     nutriments?.fat_100g ?? 0,
    imageUrl: product.image_front_url ?? null,
  };
};

// `q` is Lucene syntax; a stray quote or colon from the user must not change
// the query's meaning.
const LUCENE_SPECIAL = /[+\-!(){}[\]^"~*?:\\/&|]/g;
const SEARCH_TIMEOUT_MS = 8_000;

const fetchHits = async (q: string, signal: AbortSignal) => {
  // Omit langs: the server default full-text search surfaces Polish products fine; langs=pl alone returns almost nothing
  const url = `${OFF_SEARCH_URL}?q=${encodeURIComponent(q)}&page_size=20&fields=${SEARCH_FIELDS}`;
  const response = await fetch(url, { headers: offHeaders(), signal });
  if (!response.ok) throw new Error(`OFF search failed: HTTP ${response.status}`);
  return ((await response.json()) as OpenFoodFactsSearchResponse).hits ?? [];
};

export const searchProductsByName = async (
  query: string,
  signal?: AbortSignal,
): Promise<OpenFoodFactsSearchItem[]> => {
  const terms = query.replace(LUCENE_SPECIAL, " ").trim();
  if (terms.length < 2) return [];

  // OFF search doesn't send CORS headers — browser blocks it; skip on web entirely
  if (Platform.OS === "web") return [];

  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort);
  const timeout = setTimeout(abort, SEARCH_TIMEOUT_MS);

  try {
    // search-a-licious has no country boost, so Polish products come from a
    // second, filtered request and go first. Without it "twaróg półtłusty"
    // returns Irish salads.
    const [pl, world] = await Promise.allSettled([
      fetchHits(`${terms} countries_tags:"en:poland"`, controller.signal),
      fetchHits(terms, controller.signal),
    ]);
    // Let network/5xx failures reject so the UI shows an error instead of a false "no results"
    if (pl.status === "rejected" && world.status === "rejected") throw pl.reason;

    const seen = new Set<string>();
    return [
      ...(pl.status === "fulfilled" ? pl.value : []),
      ...(world.status === "fulfilled" ? world.value : []),
    ]
      .map(productToSearchItem)
      .filter((item): item is OpenFoodFactsSearchItem => {
        if (!item || seen.has(item.code)) return false;
        seen.add(item.code);
        return true;
      });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
};

export const lookupProductByBarcode = async (
  barcode: string,
  signal?: AbortSignal,
): Promise<ProductLookupResult> => {
  const url = `${OFF_URL}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${PRODUCT_FIELDS}`;

  let response: Response;

  try {
    response = await fetch(url, { headers: offHeaders(), signal });
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
      // Label energy, so a scanned product shows the same kcal as when searched.
      kcalPer100g: resolveKcal(nutriments),
      source: "barcode",
      barcode: product.code ?? data.code ?? barcode,
      photoUrl: product.image_front_url ?? null,
    },
  };
};
