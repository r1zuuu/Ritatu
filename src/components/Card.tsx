import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { radius, shadow } from "../theme/layout";

type Variant = "flat" | "elevated" | "hero";

/**
 * Single source of card styling. Every screen used to redefine an identical
 * card block; this consolidates them and adds depth so cards read as raised
 * objects instead of outlined rectangles. Padding stays with the caller.
 */
export function Card({
  children,
  variant = "elevated",
  style,
}: PropsWithChildren<{ variant?: Variant; style?: StyleProp<ViewStyle> }>) {
  return <View style={[c.base, c[variant], style]}>{children}</View>;
}

const c = StyleSheet.create({
  base: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  flat: {},
  elevated: {
    backgroundColor: colors.elevated,
    ...shadow.card,
  },
  hero: {
    backgroundColor: colors.elevated,
    borderRadius: radius.xl,
    ...shadow.hero,
  },
});
