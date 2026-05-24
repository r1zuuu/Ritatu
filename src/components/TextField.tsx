import { KeyboardTypeOptions, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../theme/colors";

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export const TextField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  accessibilityLabel,
  accessibilityHint,
}: TextFieldProps) => (
  <View style={styles.wrap}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType}
      placeholderTextColor={colors.muted}
      style={styles.input}
    />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
});
