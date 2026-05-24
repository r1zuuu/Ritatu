import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { MacroConfirmSheet } from "../components/MacroConfirmSheet";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import type { MealDraft } from "../data/types";
import { useMeals } from "../providers/MealsProvider";
import { colors } from "../theme/colors";

const num = (value: string) => Number(value.replace(",", "."));

export const ManualEntryScreen = () => {
  const { addMeal } = useMeals();
  const params = useLocalSearchParams<{ section?: string; barcode?: string }>();
  const [name, setName] = useState("");
  const [weightG, setWeightG] = useState("100");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [draft, setDraft] = useState<MealDraft | null>(null);

  const canPreview =
    name.trim().length > 1 &&
    [weightG, protein, carbs, fat].every((value) => Number.isFinite(num(value)) && num(value) >= 0) &&
    num(weightG) > 0;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Ręcznie</Text>
        <Text style={styles.title}>Makro na 100 g</Text>
      </View>

      <View style={styles.form}>
        <TextField label="Nazwa" value={name} onChangeText={setName} />
        <TextField label="Gramatura" value={weightG} onChangeText={setWeightG} keyboardType="decimal-pad" />
        <TextField label="Białko / 100 g" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" />
        <TextField label="Węgle / 100 g" value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" />
        <TextField label="Tłuszcze / 100 g" value={fat} onChangeText={setFat} keyboardType="decimal-pad" />
      </View>

      <Button
        title="Dalej"
        disabled={!canPreview}
        onPress={() =>
          setDraft({
            name,
            weightG: num(weightG),
            proteinPer100g: num(protein),
            carbsPer100g: num(carbs),
            fatPer100g: num(fat),
            source: "manual",
            section: params.section ?? null,
            barcode: params.barcode ?? null,
          })
        }
      />

      <MacroConfirmSheet
        visible={Boolean(draft)}
        draft={draft}
        onClose={() => setDraft(null)}
        onConfirm={async (confirmed) => {
          await addMeal(confirmed);
          setDraft(null);
          router.replace("/home");
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    gap: 8,
    marginBottom: 20,
  },
  eyebrow: {
    color: colors.muted,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "900",
  },
  form: {
    gap: 14,
    marginBottom: 22,
  },
});
