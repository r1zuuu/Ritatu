export const env = {
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
  },
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "",
  googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "",
};

export const isFirebaseConfigured = [
  env.firebase.apiKey,
  env.firebase.authDomain,
  env.firebase.projectId,
  env.firebase.appId,
].every(Boolean);

export const isGoogleAuthConfigured = Boolean(env.googleWebClientId);
export const isApiConfigured = Boolean(env.apiBaseUrl);
