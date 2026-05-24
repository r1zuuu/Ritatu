import { KeyboardTypeOptions, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../theme/colors";

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
};

export const TextField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
}: TextFieldProps) => (
  <View style={styles.wrap}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      accessibilityLabel={label}
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
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  input: {
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
});
