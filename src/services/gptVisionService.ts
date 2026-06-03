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
    estimated_weight_g: toNumber(data.estimated_weight_g, "estimated_weight_g"),
    confidence: toConfidence(data.confidence),
    protein_per_100g: toNumber(data.protein_per_100g, "protein_per_100g"),
    carbs_per_100g: toNumber(data.carbs_per_100g, "carbs_per_100g"),
    fat_per_100g: toNumber(data.fat_per_100g, "fat_per_100g"),
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
  const titleHint = mealTitle?.trim()
    ? `Uzytkownik twierdzi ze to: "${mealTitle.trim()}". `
    : "";
  return `${titleHint}Rozpoznaj posilek na zdjeciu i oszacuj makro na 100g oraz gramature. Przy szacowaniu gramów: dokladnie przeanalizuj rozmiar talerza lub naczynia wzgledem ilosci jedzenia, uwzglednij glebie i objetosc porcji, nie zaniżaj.`;
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
          content:
            "Jestes dietetykiem i ekspertem od porcji. Odpowiedz tylko JSON-em. Pola: dish_name (string), estimated_weight_g (number — szacuj gramatury bardzo ostroznie: analizuj rozmiar talerza/naczynia i ilosc jedzenia, nie zanizaj), protein_per_100g (number), carbs_per_100g (number), fat_per_100g (number), confidence (low|medium|high), note (string|null).",
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
- Gramatura: ${previous.estimated_weight_g}g
- Białko/100g: ${previous.protein_per_100g}g, Węglowodany/100g: ${previous.carbs_per_100g}g, Tłuszcze/100g: ${previous.fat_per_100g}g

Komentarz użytkownika: "${userContext.trim()}"

Popraw analizę biorąc pod uwagę komentarz i zdjęcie. Zwróć poprawiony JSON.`;

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
            content:
              "Jestes dietetykiem. Poprzednia analiza zostala zakwestionowana. Popraw ja na podstawie komentarza uzytkownika i zdjecia. Odpowiedz tylko JSON-em z polami: dish_name, estimated_weight_g, protein_per_100g, carbs_per_100g, fat_per_100g, confidence, note.",
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
