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
    lineHeight: 52,
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
  label: {
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    lineHeight: 16,
  },
  button: {
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
    lineHeight: 20,
  },
  // Barlow — ONLY for very short uppercase decorators: eyebrows, day initials
  stat: {
    fontFamily: fontFamilies.barlow,
    fontSize: 10,
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
