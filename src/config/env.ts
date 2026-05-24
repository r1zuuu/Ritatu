import Constants from "expo-constants";

type ExtraConfig = {
  apiBaseUrl?: string;
  openaiApiKey?: string;
  openaiVisionModel?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

export const env = {
  apiBaseUrl: extra.apiBaseUrl ?? "",
  openaiApiKey: extra.openaiApiKey ?? "",
  openaiVisionModel: extra.openaiVisionModel ?? "",
};

export const isApiConfigured = Boolean(env.apiBaseUrl);
export const isOpenAiConfigured = Boolean(env.openaiApiKey);
