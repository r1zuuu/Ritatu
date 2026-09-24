import { env } from "../config/env";
import { round } from "../core/macroCalculator";
import type { Confidence, VisionItem, VisionMealResult } from "../data/types";

// Gemini 3.1 Flash-Lite: in a 2026 benchmark of 3229 meal photos it was within
// a hair of the best calorie estimates and best at naming ingredients, at about
// the same per-photo cost as GPT-5.6 Luna.
const MODEL = "gemini-3.1-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_OUTPUT_TOKENS = 4096;
const TIMEOUT_MS = 40_000;

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
- Pamietaj o tluszczu uzytym do smazenia i o sosach, nawet jesli slabo je widac.
- NIE zwracaj sumy dania — sumy policzy kod z pola items.

KONTROLA:
- Sprawdz sam dla siebie: suma (protein_g*4 + carbs_g*4 + fat_g*9) po skladnikach powinna dac rozsadna kalorycznosc (obiad domowy 400-800, fast-food 500-1200, koktajl 200-600, przekaska 100-400). Poza skala — popraw wagi/skladniki.
- Napoje i zupy maja niskie wartosci na 100 g; nie zawyzaj ich.

JEZYK:
- dish_name, name i note pisz po polsku, z polskimi znakami. Nazwy krotkie, np. "Ryż biały gotowany".

PEWNOSC (confidence):
- high: user podal konkretne ilosci wszystkich glownych skladnikow.
- medium: czesc ilosci z opisu, czesc szacowana ze zdjecia.
- low: brak opisu lub mocno niejasna porcja; szacujesz glownie ze zdjecia.

JESLI NA ZDJECIU NIE MA JEDZENIA lub nie da sie nic oszacowac: zwroc pusta liste items, confidence "low", wyjasnij w "note".`;

// Gemini structured output (OpenAPI subset). propertyOrdering puts items
// before confidence, so the model reasons about ingredients first.
const VISION_SCHEMA = {
  type: "OBJECT",
  properties: {
    dish_name: { type: "STRING" },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          weight_g: { type: "NUMBER" },
          protein_g: { type: "NUMBER" },
          carbs_g: { type: "NUMBER" },
          fat_g: { type: "NUMBER" },
        },
        required: ["name", "weight_g", "protein_g", "carbs_g", "fat_g"],
        propertyOrdering: ["name", "weight_g", "protein_g", "carbs_g", "fat_g"],
      },
    },
    confidence: { type: "STRING", enum: ["low", "medium", "high"] },
    note: { type: "STRING", nullable: true },
  },
  required: ["dish_name", "items", "confidence", "note"],
  propertyOrdering: ["dish_name", "items", "confidence", "note"],
} as const;

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; message?: string; status?: string };
};

// What the user sees. Technical detail goes to console.warn only: raw API
// errors are English and meaningless on a phone.
const MESSAGES = {
  noKey: "Brakuje klucza Gemini (EXPO_PUBLIC_GEMINI_API_KEY w .env).",
  auth: "Klucz Gemini jest nieprawidłowy albo nie ma dostępu do modelu.",
  quota: "Limit zapytań do AI na chwilę się wyczerpał. Spróbuj za minutę.",
  network: "Nie udało się połączyć z AI. Sprawdź internet i spróbuj ponownie.",
  timeout: "Analiza trwa zbyt długo. Spróbuj ponownie.",
  blocked: "AI nie przeanalizowało tego zdjęcia. Spróbuj innego ujęcia.",
  invalid: "AI zwróciło niepełną odpowiedź. Spróbuj ponownie.",
};

const fail = (message: string, detail?: unknown): never => {
  if (detail !== undefined) console.warn("[vision]", detail);
  throw new Error(message);
};

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
      if (options.signal?.aborted || attempt >= retries) throw err;
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
    dish_name: typeof data.dish_name === "string" && data.dish_name.trim() ? data.dish_name.trim() : "Posiłek",
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

// Jeden punkt wywolania Gemini — uzywany i przez analyze, i przez refine.
const callGemini = async (
  userText: string,
  base64: string,
  mimeType: string,
): Promise<VisionMealResult> => {
  if (!env.geminiApiKey) fail(MESSAGES.noKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetchWithRetry(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.geminiApiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: VISION_SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [{ text: userText }, { inline_data: { mime_type: mimeType, data: base64 } }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          responseMimeType: "application/json",
          responseSchema: VISION_SCHEMA,
        },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    return fail(controller.signal.aborted ? MESSAGES.timeout : MESSAGES.network, err);
  } finally {
    clearTimeout(timeout);
  }

  const payload = (await response.json().catch(() => null)) as GeminiResponse | null;
  if (!response.ok) {
    const detail = payload?.error ?? response.status;
    // Gemini answers a bad key with 400 API_KEY_INVALID and an unknown model with 404.
    if ([400, 401, 403, 404].includes(response.status)) fail(MESSAGES.auth, detail);
    if (response.status === 429) fail(MESSAGES.quota, detail);
    fail(MESSAGES.network, detail);
  }

  if (payload?.promptFeedback?.blockReason) fail(MESSAGES.blocked, payload.promptFeedback);
  const candidate = payload?.candidates?.[0];
  if (candidate?.finishReason && candidate.finishReason !== "STOP") {
    fail(candidate.finishReason === "MAX_TOKENS" ? MESSAGES.invalid : MESSAGES.blocked, candidate.finishReason);
  }

  // Thinking models may return thought parts before the answer; skip them.
  const text = (candidate?.content?.parts ?? [])
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text)
    .join("");

  try {
    return parseVisionResult(JSON.parse(text));
  } catch (err) {
    return fail(MESSAGES.invalid, { err, text });
  }
};

export const analyzeMealPhoto = (
  base64: string,
  mimeType = "image/jpeg",
  mealTitle?: string,
): Promise<VisionMealResult> => callGemini(buildUserText(mealTitle), base64, mimeType);

export const refineMealAnalysis = async (
  base64: string,
  mimeType: string,
  previous: VisionMealResult,
  userContext: string,
): Promise<VisionMealResult> => {
  const prevItems =
    previous.items.map((i) => `${i.name} ${round(i.weight_g)}g`).join(", ") || "brak skladnikow";

  const refineText = `Poprzednia analiza (z poprawkami uzytkownika): ${previous.dish_name} — ${prevItems} (lacznie ~${round(
    previous.total_weight_g,
  )}g, ${round(previous.protein_g)}B/${round(previous.carbs_g)}W/${round(previous.fat_g)}T).

KOREKTA UZYTKOWNIKA (nadrzedna nad poprzednia analiza): "${userContext.trim()}"

Przelicz makro od nowa skladnik po skladniku, uwzgledniajac korekte i zdjecie. Zwroc poprawiony JSON.`;

  return callGemini(refineText, base64, mimeType);
};
