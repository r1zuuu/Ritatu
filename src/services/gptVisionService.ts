import { env, isApiConfigured, isOpenAiConfigured } from "../config/env";
import { round } from "../core/macroCalculator";
import type { Confidence, VisionItem, VisionMealResult } from "../data/types";

type AnalyzeMealPhotoResponse =
  | VisionMealResult
  | {
      result?: VisionMealResult;
      error?: string;
    };

type OpenAiResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const DEFAULT_OPENAI_MODEL = "gpt-4o";
const MAX_TOKENS = 2000;
const IMAGE_DETAIL = "high";

const VISION_SYSTEM_PROMPT = `Jestes ekspertem od wartosci odzywczych i szacowania porcji. Odpowiadasz TYLKO JSON-em, bez tekstu przed ani po.

ZRODLO PRAWDY (kolejnosc waznosci):
1. OPIS TEKSTOWY uzytkownika jest najwazniejszy. Jesli podaje ilosci ("3 jajka", "4 plastry boczku", "150g ryzu") — uzyj tych ilosci DOKLADNIE. NIE zgaduj porcji ze zdjecia, gdy ilosc jest podana w tekscie.
2. ZDJECIE sluzy do: rozpoznania skladnikow oraz OSZACOWANIA WAGI (w gramach) kazdego skladnika, ktorego user nie okreslil ilosciowo.
3. Gdy opis i zdjecie sie roznia (user pisze 3 jajka, widac 2) — zaufaj OPISOWI, ale odnotuj rozbieznosc w "note".

METODA — licz skladnik po skladniku, nigdy "na oko" dla calosci:
- Rozbij posilek na pojedyncze skladniki.
- Dla kazdego skladnika oszacuj WAGE w gramach (weight_g) na podstawie zdjecia (rozmiar porcji, talerz jako skala) lub opisu.
- Dla tej wagi policz protein_g, carbs_g, fat_g z typowych wartosci odzywczych, np. (na 100 g surowca):
  - piers z kurczaka ~ 31 B / 0 W / 4 T
  - ugotowany ryz ~ 2.5 B / 28 W / 0.3 T
  - jajko (~50 g) ~ 6 B / 0 W / 5 T
  - chleb ~ 9 B / 49 W / 3 T
  - oliwa/olej ~ 0 B / 0 W / 100 T
  (to kotwice; dla innych skladnikow uzyj wiedzy o ich wartosciach i przeskaluj do weight_g)
- NIE zwracaj sumy dania — sumy policzy kod z pola items.

KONTROLA:
- Sprawdz sam dla siebie: suma (protein_g*4 + carbs_g*4 + fat_g*9) po skladnikach powinna dac rozsadna kalorycznosc (obiad domowy 400-800, fast-food 500-1200, koktajl 200-600, przekaska 100-400). Poza skala — popraw wagi/skladniki.

PEWNOSC (confidence):
- high: user podal konkretne ilosci wszystkich glownych skladnikow.
- medium: czesc ilosci z opisu, czesc szacowana ze zdjecia.
- low: brak opisu lub mocno niejasna porcja; szacujesz glownie ze zdjecia.

JESLI NA ZDJECIU NIE MA JEDZENIA lub nie da sie nic oszacowac: zwroc pusta liste items, confidence "low", wyjasnij w "note".`;

// OpenAI Structured Outputs — wymusza dokladny ksztalt odpowiedzi (strict).
const VISION_JSON_SCHEMA = {
  name: "meal_analysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["dish_name", "items", "confidence", "note"],
    properties: {
      dish_name: { type: "string" },
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "weight_g", "protein_g", "carbs_g", "fat_g"],
          properties: {
            name: { type: "string" },
            weight_g: { type: "number" },
            protein_g: { type: "number" },
            carbs_g: { type: "number" },
            fat_g: { type: "number" },
          },
        },
      },
      confidence: { type: "string", enum: ["low", "medium", "high"] },
      note: { type: ["string", "null"] },
    },
  },
} as const;

const endpoint = (path: string) =>
  `${env.apiBaseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry tylko na przejsciowe bledy (429 rate-limit, 5xx serwer) z rosnaca przerwa.
const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  retries = 2,
): Promise<Response> => {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, options);
      if ((response.status === 429 || response.status >= 500) && attempt < retries) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      return response;
    } catch (err) {
      if (attempt >= retries) throw err;
      await sleep(500 * 2 ** attempt);
    }
  }
};

const toNumber = (value: unknown, field: string): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new Error(`AI zwrocilo niepoprawne pole: ${field}.`);
};

const toString = (value: unknown, field: string): string => {
  if (typeof value === "string" && value.trim()) return value.trim();
  throw new Error(`AI zwrocilo niepoprawne pole: ${field}.`);
};

const toConfidence = (value: unknown): Confidence =>
  value === "low" || value === "medium" || value === "high" ? value : "medium";

const toNote = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const parseItem = (value: unknown, index: number): VisionItem => {
  if (!value || typeof value !== "object") {
    throw new Error(`AI zwrocilo niepoprawny skladnik #${index + 1}.`);
  }
  const it = value as Record<string, unknown>;
  return {
    name: toString(it.name, `items[${index}].name`),
    weight_g: toNumber(it.weight_g, `items[${index}].weight_g`),
    protein_g: toNumber(it.protein_g, `items[${index}].protein_g`),
    carbs_g: toNumber(it.carbs_g, `items[${index}].carbs_g`),
    fat_g: toNumber(it.fat_g, `items[${index}].fat_g`),
  };
};

// Sumy total liczy kod (reduce), nie LLM — model nie myli sie w dodawaniu.
const sumItems = (items: VisionItem[]) =>
  items.reduce(
    (acc, it) => ({
      total_weight_g: acc.total_weight_g + it.weight_g,
      protein_g: acc.protein_g + it.protein_g,
      carbs_g: acc.carbs_g + it.carbs_g,
      fat_g: acc.fat_g + it.fat_g,
    }),
    { total_weight_g: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );

const parseVisionResult = (payload: unknown): VisionMealResult => {
  if (!payload || typeof payload !== "object") {
    throw new Error("AI nie zwrocilo poprawnej analizy posilku.");
  }
  const data = payload as Record<string, unknown>;
  const items = (Array.isArray(data.items) ? data.items : []).map(parseItem);

  return {
    dish_name: toString(data.dish_name, "dish_name"),
    confidence: toConfidence(data.confidence),
    items,
    ...sumItems(items),
    note: toNote(data.note),
  };
};

const buildUserText = (mealTitle?: string) => {
  const description = mealTitle?.trim();
  return description
    ? `OPIS UZYTKOWNIKA (zrodlo prawdy): "${description}". Policz makro zgodnie z opisem (uzyj podanych ilosci doslownie), a zdjecia uzyj do rozpoznania i oszacowania wagi skladnikow ktorych user nie wymienil.`
    : `Brak opisu tekstowego. Rozpoznaj danie i oszacuj wage kazdego skladnika ze zdjecia, skladnik po skladniku.`;
};

const buildRequestBody = (userText: string, base64: string, mimeType: string) => ({
  model: env.openaiVisionModel || DEFAULT_OPENAI_MODEL,
  temperature: 0.2,
  max_tokens: MAX_TOKENS,
  response_format: { type: "json_schema", json_schema: VISION_JSON_SCHEMA },
  messages: [
    { role: "system", content: VISION_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text: userText },
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${base64}`, detail: IMAGE_DETAIL },
        },
      ],
    },
  ],
});

// Jeden punkt wywolania OpenAI — uzywany i przez analyze, i przez refine.
const callOpenAi = async (
  userText: string,
  base64: string,
  mimeType: string,
): Promise<VisionMealResult> => {
  const response = await fetchWithRetry(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openaiApiKey}`,
    },
    body: JSON.stringify(buildRequestBody(userText, base64, mimeType)),
  });

  const payload = (await response.json().catch(() => null)) as OpenAiResponse | null;
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Nie udalo sie przeanalizowac zdjecia.");
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("OpenAI nie zwrocilo odpowiedzi.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI zwrocilo niepoprawny JSON.");
  }

  return parseVisionResult(parsed);
};

const analyzeMealPhotoViaApi = async (
  base64: string,
  mimeType = "image/jpeg",
  mealTitle?: string,
): Promise<VisionMealResult> => {
  // ponytail: sciezka proxy jest nieaktualna — scripts/openai-proxy.mjs nie zwraca
  // jeszcze pola items. Zaktualizuj proxy przed ustawieniem EXPO_PUBLIC_API_BASE_URL.
  const response = await fetch(endpoint("/analyze-meal-photo"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: base64, mimeType, mealTitle }),
  });

  const payload = (await response.json().catch(() => null)) as AnalyzeMealPhotoResponse | null;

  if (!response.ok) {
    const message =
      payload && "error" in payload && payload.error
        ? payload.error
        : "Nie udalo sie przeanalizowac zdjecia.";
    throw new Error(message);
  }

  const result = payload && "result" in payload && payload.result ? payload.result : payload;

  if (!result || !("dish_name" in result)) {
    throw new Error("Backend nie zwrocil poprawnej analizy posilku.");
  }

  return result as VisionMealResult;
};

export const analyzeMealPhoto = async (
  base64: string,
  mimeType = "image/jpeg",
  mealTitle?: string,
): Promise<VisionMealResult> => {
  if (isApiConfigured) {
    return analyzeMealPhotoViaApi(base64, mimeType, mealTitle);
  }

  if (isOpenAiConfigured) {
    return callOpenAi(buildUserText(mealTitle), base64, mimeType);
  }

  throw new Error(
    "Brakuje EXPO_PUBLIC_API_BASE_URL lub EXPO_PUBLIC_OPENAI_API_KEY. Dodaj klucz OpenAI do configu aplikacji.",
  );
};

export const refineMealAnalysis = async (
  base64: string,
  mimeType: string,
  previous: VisionMealResult,
  userContext: string,
): Promise<VisionMealResult> => {
  if (!isOpenAiConfigured) {
    throw new Error("Brakuje EXPO_PUBLIC_OPENAI_API_KEY.");
  }

  const prevItems =
    previous.items.map((i) => `${i.name} ${round(i.weight_g)}g`).join(", ") || "brak skladnikow";

  const refineText = `Poprzednia analiza: ${previous.dish_name} — ${prevItems} (lacznie ~${round(
    previous.total_weight_g,
  )}g, ${round(previous.protein_g)}B/${round(previous.carbs_g)}W/${round(previous.fat_g)}T).

KOREKTA UZYTKOWNIKA (nadrzedna nad poprzednia analiza): "${userContext.trim()}"

Przelicz makro od nowa skladnik po skladniku, uwzgledniajac korekte i zdjecie. Zwroc poprawiony JSON.`;

  return callOpenAi(refineText, base64, mimeType);
};
