import Constants from "expo-constants";

type ExtraConfig = {
  firebase?: Record<string, string | undefined>;
  apiBaseUrl?: string;
  googleWebClientId?: string;
  googleIosClientId?: string;
  googleAndroidClientId?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

export const env = {
  firebase: {
    apiKey: extra.firebase?.apiKey ?? "",
    authDomain: extra.firebase?.authDomain ?? "",
    projectId: extra.firebase?.projectId ?? "",
    appId: extra.firebase?.appId ?? "",
  },
  apiBaseUrl: extra.apiBaseUrl ?? "",
  googleWebClientId: extra.googleWebClientId ?? "",
  googleIosClientId: extra.googleIosClientId ?? "",
  googleAndroidClientId: extra.googleAndroidClientId ?? "",
};

export const isFirebaseConfigured = [
  env.firebase.apiKey,
  env.firebase.authDomain,
  env.firebase.projectId,
  env.firebase.appId,
].every(Boolean);
export const isGoogleAuthConfigured = Boolean(env.googleWebClientId);
export const isApiConfigured = Boolean(env.apiBaseUrl);
