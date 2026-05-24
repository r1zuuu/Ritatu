import { StyleSheet, Text, View } from "react-native";
import { formatShortDate } from "../core/date";
import { calculateMealMacros, round } from "../core/macroCalculator";
import type { MealEntry } from "../data/types";
import { colors } from "../theme/colors";

const sourceLabel: Record<MealEntry["source"], string> = {
  barcode: "Kod",
  photo: "Zdjęcie",
  manual: "Ręcznie",
};

export const MealCard = ({ meal }: { meal: MealEntry }) => {
  const macros = calculateMealMacros(meal, meal.weightG);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.name}>{meal.name}</Text>
          <Text style={styles.meta}>
            {sourceLabel[meal.source]} · {formatShortDate(meal.timestamp)} · {round(meal.weightG)} g
          </Text>
        </View>
        <Text style={styles.kcal}>{round(macros.kcal)} kcal</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.macro}>B {round(macros.proteinG)} g</Text>
        <Text style={styles.macro}>W {round(macros.carbsG)} g</Text>
        <Text style={styles.macro}>T {round(macros.fatG)} g</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  titleWrap: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  kcal: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  macro: {
    color: colors.muted,
    fontWeight: "800",
  },
});
