import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Sheet } from "../../components/Sheet";
import { Icon } from "../../components/Icon";
import { parseDecimal, formatDecimal } from "../../core/numberFormat";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { sh } from "../../theme/sharedStyles";

type Props = {
  visible: boolean;
  lastWeight?: number;
  onClose: () => void;
  onSave: (kg: number) => void;
};

export const AddWeightSheet = ({ visible, lastWeight, onClose, onSave }: Props) => {
  const [value, setValue] = useState(lastWeight != null ? formatDecimal(lastWeight, 1) : "");

  useEffect(() => {
    if (visible) setValue(lastWeight != null ? formatDecimal(lastWeight, 1) : "");
  }, [visible, lastWeight]);

  const parsed = parseDecimal(value);
  const valid = Number.isFinite(parsed) && parsed >= 30 && parsed <= 250;

  const change = (delta: number) => {
    const base = Number.isFinite(parsed) ? parsed : (lastWeight ?? 80);
    setValue(formatDecimal(Math.min(250, Math.max(30, base + delta)), 1));
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Dodaj pomiar" height="42%">
      <View style={s.wrap}>
        <View style={s.valueRow}>
          <TextInput
            style={s.input}
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            selectTextOnFocus
            accessibilityLabel="Waga w kilogramach"
          />
          <Text style={s.unit}>kg</Text>
        </View>
        {value.trim().length > 0 && !valid ? (
          <Text style={s.hint}>Podaj wagę w zakresie 30–250 kg</Text>
        ) : null}
        <View style={s.controls}>
          <Pressable style={({ pressed }) => [s.control, pressed && sh.pressed]} onPress={() => change(-0.1)}>
            <Icon name="minus" size={22} color={colors.text} />
          </Pressable>
          <Pressable style={({ pressed }) => [s.control, s.controlAccent, pressed && sh.pressed]} onPress={() => change(0.1)}>
            <Icon name="plus" size={22} color={colors.warmBlack} />
          </Pressable>
        </View>
        <Pressable
          disabled={!valid}
          style={({ pressed }) => [sh.cta, !valid && sh.disabled, pressed && valid && sh.pressed]}
          onPress={() => onSave(parsed)}
        >
          <Text style={sh.ctaText}>Zapisz pomiar</Text>
        </Pressable>
      </View>
    </Sheet>
  );
};

const s = StyleSheet.create({
  wrap: { gap: 20, paddingBottom: 28, paddingHorizontal: 20 },
  hint: { ...typography.label, color: colors.danger, marginTop: -12, textAlign: "center" },
  valueRow: { alignItems: "flex-end", flexDirection: "row", gap: 8, justifyContent: "center" },
  input: { ...typography.display, color: colors.text, minWidth: 150, paddingVertical: 0, textAlign: "center" },
  unit: { ...typography.section, color: colors.muted, paddingBottom: 7 },
  controls: { flexDirection: "row", gap: 14 },
  control: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flex: 1, height: 52, justifyContent: "center" },
  controlAccent: { backgroundColor: colors.accent, borderColor: colors.accent },
});
