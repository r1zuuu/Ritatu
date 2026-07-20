import { Platform } from "react-native";

// Rounder geometry — friendly, less boxy
export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 30,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

// Elevation presets — the app had a single shadow (the FAB); these give
// cards real depth so they read as objects, not outlined rectangles.
// iOS/web use shadow*, Android uses elevation.
export const shadow = {
  card: Platform.select({
    android: { elevation: 3 },
    default: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 14,
    },
  }),
  hero: Platform.select({
    android: { elevation: 7 },
    default: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.4,
      shadowRadius: 24,
    },
  }),
} as const;
