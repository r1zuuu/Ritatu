import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  accessibilityHint?: string;
};

export const Button = ({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  accessibilityHint,
}: ButtonProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={title}
    accessibilityHint={accessibilityHint}
    accessibilityState={{ disabled }}
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [
      styles.button,
      styles[variant],
      disabled && styles.disabled,
      pressed && !disabled && styles.pressed,
    ]}
  >
    <Text style={[styles.label, variant === "danger" && styles.dangerLabel]}>{title}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  danger: {
    backgroundColor: colors.danger,
  },
  label: {
    color: colors.warmBlack,
    fontSize: 16,
    fontWeight: "800",
  },
  dangerLabel: {
    color: colors.surface,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.86,
  },
});
