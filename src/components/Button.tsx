import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "./Icon";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  icon?: IconName;
  accessibilityHint?: string;
};

export const Button = ({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  icon,
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
    <View style={styles.content}>
      {icon ? (
        <Icon
          name={icon}
          size={18}
          color={variant === "primary" ? colors.warmBlack : colors.text}
        />
      ) : null}
      <Text style={[styles.label, variant !== "primary" && styles.lightLabel]}>{title}</Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
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
    ...typography.button,
    color: colors.warmBlack,
  },
  lightLabel: {
    color: colors.text,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.86,
  },
});
