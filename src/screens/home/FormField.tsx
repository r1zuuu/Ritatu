import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/layout";
import { fontFamilies, typography } from "../../theme/typography";

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "decimal-pad";
  placeholder?: string;
  compact?: boolean;
  featured?: boolean;
  autoFocus?: boolean;
};

export const FormField = ({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  placeholder,
  compact,
  featured,
  autoFocus,
}: FormFieldProps) => (
  <View style={[s.field, compact && { flex: 1 }]}>
    <Text style={s.label}>{label}</Text>
    <TextInput
      accessibilityLabel={label}
      style={[s.input, compact && s.inputCompact, featured && s.inputFeatured]}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      placeholder={placeholder ?? (keyboardType === "decimal-pad" ? "0" : undefined)}
      placeholderTextColor={colors.muted}
      autoFocus={autoFocus}
      selectTextOnFocus={keyboardType === "decimal-pad"}
    />
  </View>
);

const s = StyleSheet.create({
  field: { gap: 7 },
  label: { ...typography.label, color: colors.mutedMid },
  input: {
    ...typography.body,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    color: colors.text,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  inputCompact: { fontSize: 18, fontVariant: ["tabular-nums"], textAlign: "center" },
  // lineHeight must follow the size, or the inherited 22 clips the digits.
  inputFeatured: {
    color: colors.accent,
    fontFamily: fontFamilies.bold,
    fontSize: 34,
    fontVariant: ["tabular-nums"],
    lineHeight: 42,
    minHeight: 64,
    textAlign: "center",
  },
});
