const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

module.exports = {
  expo: {
    name: "Ritatu",
    slug: "ritatu",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: ["ritatu", "com.ritatu.app"],
    userInterfaceStyle: "light",
    plugins: ["expo-router", "expo-web-browser"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.ritatu.app",
    },
    android: {
      package: "com.ritatu.app",
      googleServicesFile: "./android/app/google-services.json",
      adaptiveIcon: {
        backgroundColor: "#F5F7F2",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    extra: {
      firebase: firebaseConfig,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    },
  },
};
