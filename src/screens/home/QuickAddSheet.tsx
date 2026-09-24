import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { Sheet } from "../../components/Sheet";
import { parseDecimal } from "../../core/numberFormat";
import { isSection, SECTION_GENITIVE } from "../../core/section";
import { colors } from "../../theme/colors";
import { space } from "../../theme/layout";
import { typography } from "../../theme/typography";
import { FormField } from "./FormField";
import type { FoodItem } from "./types";

type Props = {
  visible: boolean;
  section: string;
  onClose: () => void;
  onConfirm: (food: FoodItem) => Promise<void>;
};

// For meals with no label or database entry: a name and the kcal you know.
export const QuickAddSheet = ({ visible, section, onClose, onConfirm }: Props) => {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [saving, setSaving] = useState(false);

  const kcalValue = parseDecimal(kcal);
  const valid = name.trim().length > 0 && Number.isFinite(kcalValue) && kcalValue > 0;
  const where = isSection(section) ? SECTION_GENITIVE[section] : section.toLowerCase();

  const reset = () => { setName(""); setKcal(""); setProtein(""); setCarbs(""); setFat(""); };

  const confirm = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onConfirm({
        id: Date.now(),
        name: name.trim(),
        detail: "Szybkie kcal",
        calories: kcalValue,
        protein: parseDecimal(protein) || 0,
        carbs: parseDecimal(carbs) || 0,
        fat: parseDecimal(fat) || 0,
        per100: false,
        oneTime: true,
      });
      reset();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={() => { reset(); onClose(); }} title={`Szybkie kcal do ${where}`} height="fit">
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <FormField label="Co to było?" value={name} onChangeText={setName} placeholder="np. pizza na mieście" autoFocus />
        <FormField label="Kalorie" value={kcal} onChangeText={setKcal} keyboardType="decimal-pad" featured />
        <Text style={s.hint}>Makra (opcjonalnie), na całą porcję</Text>
        <View style={s.macroGrid}>
          <FormField label="Białko (g)" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" compact />
          <FormField label="Węgle (g)" value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" compact />
          <FormField label="Tłuszcze (g)" value={fat} onChangeText={setFat} keyboardType="decimal-pad" compact />
        </View>
        {!valid ? <Text style={s.validHint}>Podaj nazwę i kalorie</Text> : null}
        <Button
          title={saving ? "Dodaję..." : `Dodaj do ${where}`}
          icon="plus"
          disabled={!valid || saving}
          onPress={() => void confirm()}
        />
      </ScrollView>
    </Sheet>
  );
};

const s = StyleSheet.create({
  scroll: { gap: space.lg, paddingBottom: space.lg, paddingHorizontal: space.xl },
  hint: { ...typography.label, color: colors.mutedMid, marginBottom: -8 },
  validHint: { ...typography.caption, color: colors.mutedMid, marginBottom: -8, textAlign: "center" },
  macroGrid: { flexDirection: "row", gap: 10 },
});
