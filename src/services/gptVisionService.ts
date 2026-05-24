import { env, isApiConfigured } from "../config/env";
import type { VisionMealResult } from "../data/types";

type AnalyzeMealPhotoResponse =
  | VisionMealResult
  | {
      result?: VisionMealResult;
      error?: string;
    };

const endpoint = (path: string) =>
  `${env.apiBaseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

export const analyzeMealPhoto = async (
  base64: string,
  mimeType = "image/jpeg",
): Promise<VisionMealResult> => {
  if (!isApiConfigured) {
    throw new Error("Brakuje EXPO_PUBLIC_API_BASE_URL. OpenAI key musi zostac po stronie backendu.");
  }

  const response = await fetch(endpoint("/analyze-meal-photo"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageBase64: base64,
      mimeType,
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

  return result;
};
