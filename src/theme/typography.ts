import type { TextStyle } from "react-native";

export const fontFamilies = {
  regular:  "Inter_400Regular",
  medium:   "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold:     "Inter_700Bold",
  // Barlow Light — uppercase precision labels only (eyebrows, day initials)
  barlow:   "Barlow_300Light",
};

export const typography = {
  display: {
    fontFamily: fontFamilies.bold,
    fontSize: 48,
    fontVariant: ["tabular-nums"] as TextStyle["fontVariant"],
    lineHeight: 52,
  },
  headline: {
    fontFamily: fontFamilies.semibold,
    fontSize: 22,
    lineHeight: 28,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 28,
    lineHeight: 34,
  },
  section: {
    fontFamily: fontFamilies.semibold,
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    lineHeight: 16,
  },
  // Smallest readable size, for data labels (axis, day initials). Inter, not
  // Barlow: Barlow Light at this size is too thin to read.
  micro: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    lineHeight: 14,
  },
  button: {
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
    lineHeight: 20,
  },
  // Barlow — ONLY for very short uppercase decorators: eyebrows, day initials
  stat: {
    fontFamily: fontFamilies.barlow,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase" as const,
  },
  statMd: {
    fontFamily: fontFamilies.barlow,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
};
