import { Pressable, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { Icon, type IconName } from "./Icon";

type IconButtonProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: "default" | "accent";
  disabled?: boolean;
};

export const IconButton = ({ icon, label, onPress, tone = "default", disabled = false }: IconButtonProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={disabled ? undefined : onPress}
    style={({ pressed }) => [
      styles.button,
      tone === "accent" && styles.accent,
      disabled && styles.disabled,
      !disabled && pressed && styles.pressed,
    ]}
  >
    <Icon
      name={icon}
      size={20}
      color={disabled ? colors.muted : tone === "accent" ? colors.accent : colors.mutedMid}
    />
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  accent: {
    backgroundColor: colors.accentA,
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.6 },
});
