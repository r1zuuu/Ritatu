import { Pressable, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { Icon } from "./Icon";

// The icon font only has an outline heart, so "on" is the accent colour on a
// tinted disc rather than a filled glyph.
export const FavoriteButton = ({ active, onPress }: { active: boolean; onPress: () => void }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={active ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
    accessibilityState={{ selected: active }}
    hitSlop={6}
    onPress={onPress}
    style={({ pressed }) => [s.button, active && s.active, pressed && s.pressed]}
  >
    <Icon name="heart" size={22} color={active ? colors.accent : colors.mutedMid} />
  </Pressable>
);

const s = StyleSheet.create({
  button: {
    alignItems: "center",
    borderColor: colors.borderMid,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  active: { backgroundColor: colors.accentA, borderColor: colors.accent },
  pressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
});
