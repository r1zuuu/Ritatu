import { StyleSheet, Text, View } from "react-native";
import { formatShortDate } from "../core/date";
import { calculateMealMacros, round } from "../core/macroCalculator";
import type { MealEntry } from "../data/types";
import { colors } from "../theme/colors";

const sourceLabel: Record<MealEntry["source"], string> = {
  barcode: "Kod kreskowy",
  photo: "Skan AI",
  manual: "Wpis ręczny",
};

export const MealCard = ({ meal }: { meal: MealEntry }) => {
  const macros = calculateMealMacros(meal, meal.weightG);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.name}>{meal.name}</Text>
          <Text style={styles.meta}>
            {round(meal.weightG)}g • {sourceLabel[meal.source]} • {formatShortDate(meal.timestamp)}
          </Text>
        </View>
        <Text style={styles.kcal}>{round(macros.kcal)} <Text style={styles.unit}>kcal</Text></Text>
      </View>
      <View style={styles.row}>
        <View style={styles.macroPill}>
          <View style={[styles.dot, { backgroundColor: colors.protein }]} />
          <Text style={styles.macroText}>{round(macros.proteinG)}g</Text>
        </View>
        <View style={styles.macroPill}>
          <View style={[styles.dot, { backgroundColor: colors.carbs }]} />
          <Text style={styles.macroText}>{round(macros.carbsG)}g</Text>
        </View>
        <View style={styles.macroPill}>
          <View style={[styles.dot, { backgroundColor: colors.fat }]} />
          <Text style={styles.macroText}>{round(macros.fatG)}g</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleWrap: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "500",
  },
  kcal: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  unit: {
    fontSize: 14,
    color: colors.muted,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  macroPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 12,
  },
});
