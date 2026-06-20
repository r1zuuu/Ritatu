import { env, isApiConfigured, isOpenAiConfigured } from "../config/env";
import type { Confidence, VisionMealResult } from "../data/types";

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
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

// KEEP IN SYNC z promptem w scripts/openai-proxy.mjs (VISION_SYSTEM_PROMPT).
export const VISION_SYSTEM_PROMPT = `Jestes ekspertem od wartosci odzywczych i szacowania porcji. Odpowiadasz TYLKO JSON-em, bez tekstu przed ani po.

ZRODLO PRAWDY (kolejnosc waznosci):
1. OPIS TEKSTOWY uzytkownika jest najwazniejszy. Jesli podaje ilosci ("3 jajka", "4 plastry boczku", "150g ryzu") — policz makro DOKLADNIE z tych ilosci, ze standardowych wartosci odzywczych. NIE zgaduj porcji ze zdjecia, gdy ilosc jest podana w tekscie.
2. ZDJECIE sluzy do: potwierdzenia, oszacowania skladnikow ktorych user NIE wymienil, oraz dookreslenia porcji tam gdzie opis jest niejasny ("troche ryzu", "duza michka").
3. Gdy opis i zdjecie sie roznia (user pisze 3 jajka, widac 2) — zaufaj OPISOWI, ale odnotuj rozbieznosc w "note".

METODA — licz skladnik po skladniku, nigdy "na oko" dla calosci:
- Rozbij posilek na pojedyncze skladniki.
- Dla kazdego osobno oszacuj protein_g, carbs_g, fat_g z typowych wartosci, np.:
  - jajko M ~ 6 B / 0 W / 5 T
  - plaster boczku ~ 3 B / 0 W / 4 T
  - 100g piersi z kurczaka ~ 31 B / 0 W / 4 T
  - kromka chleba ~ 3 B / 14 W / 1 T
  - lyzka oleju/oliwy ~ 0 / 0 / 14 T
  - 100g ugotowanego ryzu ~ 2.5 B / 28 W / 0.3 T
  (to przyklady-kotwice; dla innych skladnikow uzyj wiedzy o ich wartosciach)
- Zsumuj skladniki do protein_g, carbs_g, fat_g calego posilku.

KONTROLA:
- Sprawdz: protein_g*4 + carbs_g*4 + fat_g*9 powinno dac rozsadna kalorycznosc (obiad domowy 400-800, fast-food 500-1200, koktajl 200-600, przekaska 100-400). Jesli poza skala — popraw skladniki, nie sume.

PEWNOSC (confidence):
- high: user podal konkretne ilosci wszystkich glownych skladnikow.
- medium: czesc ilosci z opisu, czesc szacowana ze zdjecia.
- low: brak opisu lub mocno niejasna porcja; szacujesz glownie ze zdjecia.

JESLI NA ZDJECIU NIE MA JEDZENIA lub nie da sie nic oszacowac: zwroc zera, confidence "low", wyjasnij w "note".

POLA JSON:
dish_name (string)
items (array of {name: string, qty: string, protein_g: number, carbs_g: number, fat_g: number})
protein_g (number) = suma items
carbs_g (number) = suma items
fat_g (number) = suma items
confidence ("low"|"medium"|"high")
note (string|null) — rozbieznosci, zalozenia, niepewnosci`;

const endpoint = (path: string) =>
  `${env.apiBaseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

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

const parseVisionResult = (payload: unknown): VisionMealResult => {
  if (!payload || typeof payload !== "object") {
    throw new Error("AI nie zwrocilo poprawnej analizy posilku.");
  }

  const data = payload as Record<string, unknown>;

  return {
    dish_name: toString(data.dish_name, "dish_name"),
    confidence: toConfidence(data.confidence),
    protein_g: toNumber(data.protein_g, "protein_g"),
    carbs_g: toNumber(data.carbs_g, "carbs_g"),
    fat_g: toNumber(data.fat_g, "fat_g"),
    note: toNote(data.note),
  };
};

const analyzeMealPhotoViaApi = async (
  base64: string,
  mimeType = "image/jpeg",
  mealTitle?: string,
): Promise<VisionMealResult> => {
  const response = await fetch(endpoint("/analyze-meal-photo"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageBase64: base64,
      mimeType,
      mealTitle,
    }),
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

const buildUserText = (mealTitle?: string) => {
  const description = mealTitle?.trim();
  return description
    ? `OPIS UZYTKOWNIKA (zrodlo prawdy): "${description}". Policz makro zgodnie z opisem (uzyj podanych ilosci doslownie), a zdjecia uzyj do potwierdzenia i dookreslenia skladnikow ktorych user nie wymienil.`
    : `Brak opisu tekstowego. Oszacuj makro calego posilku ze zdjecia, skladnik po skladniku.`;
};

const analyzeMealPhotoViaOpenAi = async (
  base64: string,
  mimeType = "image/jpeg",
  mealTitle?: string,
): Promise<VisionMealResult> => {
  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: env.openaiVisionModel || DEFAULT_OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: VISION_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: buildUserText(mealTitle),
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
    }),
  });

  const payload = (await response.json().catch(() => null)) as OpenAiResponse | null;

  if (!response.ok) {
    const message = payload?.error?.message ?? "Nie udalo sie przeanalizowac zdjecia.";
    throw new Error(message);
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

export const analyzeMealPhoto = async (
  base64: string,
  mimeType = "image/jpeg",
  mealTitle?: string,
): Promise<VisionMealResult> => {
  if (isApiConfigured) {
    return analyzeMealPhotoViaApi(base64, mimeType, mealTitle);
  }

  if (isOpenAiConfigured) {
    return analyzeMealPhotoViaOpenAi(base64, mimeType, mealTitle);
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
  if (!isApiConfigured && !isOpenAiConfigured) {
    throw new Error(
      "Brakuje EXPO_PUBLIC_API_BASE_URL lub EXPO_PUBLIC_OPENAI_API_KEY.",
    );
  }

  const refineText = `Poprzednia analiza:
- Danie: ${previous.dish_name}
- Białko łącznie: ${previous.protein_g}g, Węglowodany łącznie: ${previous.carbs_g}g, Tłuszcze łącznie: ${previous.fat_g}g

KOREKTA UŻYTKOWNIKA (nadrzędna nad poprzednią analizą): "${userContext.trim()}"

Przelicz makro od nowa skladnik po skladniku, uwzgledniajac korekte i zdjęcie. Zwróć poprawiony JSON.`;

  const makeRequest = async () => {
    const response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: env.openaiVisionModel || DEFAULT_OPENAI_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: VISION_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              { type: "text", text: refineText },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
            ],
          },
        ],
      }),
    });

    const payload = (await response.json().catch(() => null)) as OpenAiResponse | null;
    if (!response.ok) {
      throw new Error(payload?.error?.message ?? "Nie udało się poprawić analizy.");
    }
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI nie zwróciło odpowiedzi.");
    return parseVisionResult(JSON.parse(content));
  };

  return makeRequest();
};
