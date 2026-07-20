module.exports = {
  expo: {
    name: "Ritatu",
    slug: "ritatu",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: ["ritatu", "com.ritatu.app"],
    userInterfaceStyle: "dark",
    plugins: ["expo-router", "expo-font", "expo-updates"],
    updates: {
      url: "https://u.expo.dev/17100aa9-d04f-433e-9ff8-e1f2d85ec48e",
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 0,
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.ritatu.app",
    },
    android: {
      package: "com.ritatu.app",
      adaptiveIcon: {
        backgroundColor: "#F5F7F2",
        foregroundImage: "./assets/icon.png",
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
      openaiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY,
      openaiVisionModel: process.env.EXPO_PUBLIC_OPENAI_VISION_MODEL,
      eas: {
        projectId: "17100aa9-d04f-433e-9ff8-e1f2d85ec48e",
      },
    },
  },
};
