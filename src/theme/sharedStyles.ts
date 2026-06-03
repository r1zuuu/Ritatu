import { StyleSheet } from "react-native";
import { colors } from "./colors";
import { typography } from "./typography";

export const sh = StyleSheet.create({
  pressed: { opacity: 0.86, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.45 },
  cta: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    height: 52,
    justifyContent: "center",
  },
  ctaText: {
    ...typography.button,
    color: colors.warmBlack,
  },
});
