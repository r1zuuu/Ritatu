import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../../components/Button";
import { Sheet } from "../../components/Sheet";
import { formatDecimal, parseDecimal } from "../../core/numberFormat";
import { colors } from "../../theme/colors";
import { radius, space } from "../../theme/layout";
import { typography } from "../../theme/typography";

type Props = {
  visible: boolean;
  lastWeight?: number;
  // Today already has a weigh-in: saving replaces it rather than adding a second.
  replacesToday: boolean;
  onClose: () => void;
  onSave: (kg: number) => Promise<void>;
};

const STEPS = [-1, -0.1, 0.1, 1];

export const AddWeightSheet = ({ visible, lastWeight, replacesToday, onClose, onSave }: Props) => {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setValue(lastWeight != null ? formatDecimal(lastWeight, 1) : "");
  }, [visible, lastWeight]);

  const parsed = parseDecimal(value);
  const valid = Number.isFinite(parsed) && parsed >= 30 && parsed <= 250;

  const change = (delta: number) => {
    const base = Number.isFinite(parsed) ? parsed : (lastWeight ?? 80);
    setValue(formatDecimal(Math.min(250, Math.max(30, base + delta)), 1));
  };

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSave(parsed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Dzisiejsza waga" height="fit">
      <View style={s.wrap}>
        <View style={s.valueRow}>
          <TextInput
            style={s.input}
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            selectTextOnFocus
            placeholder="80"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Waga w kilogramach"
          />
          <Text style={s.unit}>kg</Text>
        </View>
        {value.trim().length > 0 && !valid ? <Text style={s.hint}>Podaj wagę od 30 do 250 kg.</Text> : null}
        <View style={s.controls}>
          {STEPS.map((delta) => (
            <Pressable
              key={delta}
              accessibilityRole="button"
              accessibilityLabel={`${delta > 0 ? "Dodaj" : "Odejmij"} ${Math.abs(delta)} kg`}
              style={({ pressed }) => [s.control, pressed && s.pressed]}
              onPress={() => change(delta)}
            >
              <Text style={s.controlText}>{delta > 0 ? "+" : "−"}{formatDecimal(Math.abs(delta), 1)}</Text>
            </Pressable>
          ))}
        </View>
        {replacesToday ? <Text style={s.note}>Masz już dzisiejszy pomiar, zapis go zastąpi.</Text> : null}
        <Button title={saving ? "Zapisuję..." : "Zapisz pomiar"} icon="check" disabled={!valid || saving} onPress={() => void save()} />
      </View>
    </Sheet>
  );
};

const s = StyleSheet.create({
  wrap: { gap: 18, paddingBottom: space.lg, paddingHorizontal: space.xl },
  hint: { ...typography.caption, color: colors.danger, marginTop: -8, textAlign: "center" },
  note: { ...typography.caption, color: colors.mutedMid, textAlign: "center" },
  valueRow: { alignItems: "flex-end", flexDirection: "row", gap: 8, justifyContent: "center" },
  input: { ...typography.display, color: colors.text, paddingVertical: 0, textAlign: "center", width: 170 },
  unit: { ...typography.section, color: colors.mutedMid, paddingBottom: 7 },
  controls: { flexDirection: "row", gap: 8 },
  control: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    flex: 1,
    height: 48,
    justifyContent: "center",
  },
  controlText: { ...typography.label, color: colors.text, fontSize: 15, fontVariant: ["tabular-nums"] },
  pressed: { opacity: 0.7 },
});
