import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { Sheet } from "../../components/Sheet";
import { parseDecimal } from "../../core/numberFormat";
import { colors } from "../../theme/colors";
import { space } from "../../theme/layout";
import { typography } from "../../theme/typography";
import { FormField } from "./FormField";
import type { FoodItem } from "./types";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (food: FoodItem) => Promise<void>;
};

export const CreateCustomSheet = ({ visible, onClose, onSave }: Props) => {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [portionWeight, setPortionWeight] = useState("100");
  const [saving, setSaving] = useState(false);

  const kcalValue = parseDecimal(kcal);
  const valid = name.trim().length > 0 && Number.isFinite(kcalValue) && kcalValue > 0;

  const reset = () => { setName(""); setKcal(""); setProtein(""); setCarbs(""); setFat(""); setPortionWeight("100"); };

  const save = async () => {
    if (!valid || saving) return;
    const pw = parseDecimal(portionWeight);
    const portionWeightG = Number.isFinite(pw) && pw > 0 ? pw : 100;
    setSaving(true);
    try {
      await onSave({
        id: Date.now(),
        name: name.trim(),
        detail: `1 porcja · ${portionWeightG} g`,
        calories: kcalValue,
        protein: parseDecimal(protein) || 0,
        carbs: parseDecimal(carbs) || 0,
        fat: parseDecimal(fat) || 0,
        per100: false,
        portionWeightG,
        custom: true,
      });
      reset();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={() => { reset(); onClose(); }} title="Nowy produkt" height="88%">
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <FormField label="Nazwa" value={name} onChangeText={setName} placeholder="np. moja owsianka" autoFocus />
        <FormField label="Waga 1 porcji (g)" value={portionWeight} onChangeText={setPortionWeight} keyboardType="decimal-pad" />
        <FormField label="Kalorie na porcję" value={kcal} onChangeText={setKcal} keyboardType="decimal-pad" featured />
        <Text style={s.hint}>Makra na całą porcję (opcjonalnie)</Text>
        <View style={s.macroGrid}>
          <FormField label="Białko (g)" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" compact />
          <FormField label="Węgle (g)" value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" compact />
          <FormField label="Tłuszcze (g)" value={fat} onChangeText={setFat} keyboardType="decimal-pad" compact />
        </View>
        {!valid ? <Text style={s.validHint}>Podaj przynajmniej nazwę i kalorie</Text> : null}
        <Button title={saving ? "Zapisuję..." : "Zapisz i dodaj"} icon="check" disabled={!valid || saving} onPress={() => void save()} />
      </ScrollView>
    </Sheet>
  );
};

const s = StyleSheet.create({
  scroll: { gap: space.lg, paddingBottom: 32, paddingHorizontal: space.xl },
  hint: { ...typography.label, color: colors.mutedMid, marginBottom: -8 },
  validHint: { ...typography.caption, color: colors.mutedMid, marginBottom: -8, textAlign: "center" },
  macroGrid: { flexDirection: "row", gap: 10 },
});
