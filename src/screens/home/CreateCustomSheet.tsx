import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Sheet } from "../../components/Sheet";
import { parseDecimal } from "../../core/numberFormat";
import { sh } from "../../theme/sharedStyles";
import { FormField } from "./FormField";
import type { FoodItem } from "./types";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (food: FoodItem) => void;
};

export const CreateCustomSheet = ({ visible, onClose, onSave }: Props) => {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [portionWeight, setPortionWeight] = useState("100");

  const valid = name.trim().length > 0 && Number.isFinite(parseDecimal(kcal));

  const reset = () => { setName(""); setKcal(""); setProtein(""); setCarbs(""); setFat(""); setPortionWeight("100"); };

  const save = () => {
    const pw = parseDecimal(portionWeight);
    const portionWeightG = Number.isFinite(pw) && pw > 0 ? pw : 100;
    onSave({
      id: Date.now(),
      name: name.trim(),
      detail: `1 porcja · ${portionWeightG} g`,
      calories: parseDecimal(kcal) || 0,
      protein: parseDecimal(protein) || 0,
      carbs: parseDecimal(carbs) || 0,
      fat: parseDecimal(fat) || 0,
      per100: false,
      portionWeightG,
      custom: true,
    });
    reset();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Nowy produkt" height="88%">
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <FormField label="Nazwa produktu" value={name} onChangeText={setName} />
        <FormField label="Gramatura 1 porcji (g)" value={portionWeight} onChangeText={setPortionWeight} keyboardType="decimal-pad" />
        <FormField label="Kalorie na porcję" value={kcal} onChangeText={setKcal} keyboardType="decimal-pad" featured />
        <Text style={s.hint}>Makra na całą porcję</Text>
        <View style={s.macroGrid}>
          <FormField label="Białko (g)" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" compact />
          <FormField label="Węgle (g)" value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" compact />
          <FormField label="Tłuszcze (g)" value={fat} onChangeText={setFat} keyboardType="decimal-pad" compact />
        </View>
        <Pressable
          disabled={!valid}
          style={({ pressed }) => [sh.cta, !valid && sh.disabled, pressed && valid && sh.pressed]}
          onPress={save}
        >
          <Text style={sh.ctaText}>Zapisz produkt</Text>
        </Pressable>
      </ScrollView>
    </Sheet>
  );
};

const s = StyleSheet.create({
  scroll: { gap: 16, paddingBottom: 32, paddingHorizontal: 20 },
  hint: { color: "#888", fontSize: 11, fontWeight: "700", marginBottom: -8 },
  macroGrid: { flexDirection: "row", gap: 10 },
});
