import { StyleSheet } from "react-native";
import { colors } from "./colors";
import { radius } from "./layout";
import { typography } from "./typography";

export const sh = StyleSheet.create({
  pressed: { opacity: 0.86, transform: [{ scale: 0.96 }] },
  // Full-width rows: tint instead of scale, which looks jumpy on wide targets.
  rowPressed: { backgroundColor: colors.cardHov },
  disabled: { opacity: 0.45 },
  cta: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.control,
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
