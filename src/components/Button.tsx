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
    <Text style={[styles.label, variant === "primary" ? styles.primaryLabel : undefined, variant === "danger" && styles.dangerLabel]}>{title}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surfaceAlt,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  danger: {
    backgroundColor: colors.danger,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  primaryLabel: {
    color: colors.black,
  },
  dangerLabel: {
    color: colors.black,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
});
