import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "decimal-pad";
  compact?: boolean;
  featured?: boolean;
};

export const FormField = ({ label, value, onChangeText, keyboardType = "default", compact, featured }: FormFieldProps) => (
  <View style={[s.field, compact && { flex: 1 }]}>
    <Text style={s.label}>{label}</Text>
    <TextInput
      style={[s.input, compact && s.inputCompact, featured && s.inputFeatured]}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      placeholder="0"
      placeholderTextColor={colors.muted}
    />
  </View>
);

const s = StyleSheet.create({
  field: { gap: 7 },
  label: { ...typography.label, color: colors.mutedMid, textTransform: "uppercase" },
  input: {
    ...typography.body,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  inputCompact: { fontSize: 18, textAlign: "center" },
  inputFeatured: { color: colors.accent, fontSize: 34, textAlign: "center" },
});
