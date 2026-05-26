export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  openaiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
  openaiVisionModel: process.env.EXPO_PUBLIC_OPENAI_VISION_MODEL ?? "",
};

export const isApiConfigured = Boolean(env.apiBaseUrl);
export const isOpenAiConfigured = Boolean(env.openaiApiKey);
