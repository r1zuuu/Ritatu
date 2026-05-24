import { DimensionValue, StyleSheet, Text, View } from "react-native";
import { round } from "../core/macroCalculator";
import type { MealMacros, UserProfile } from "../data/types";
import { colors } from "../theme/colors";

type NutritionBarProps = {
  totals: MealMacros;
  profile: UserProfile | null;
};

type ItemProps = {
  label: string;
  value: number;
  goal: number;
  unit: string;
  color: string;
};

const ProgressItem = ({ label, value, goal, unit, color }: ItemProps) => {
  const ratio = goal > 0 ? value / goal : 0;
  const over = ratio > 1;
  const fill = `${Math.min(ratio, 1) * 100}%` as DimensionValue;

  return (
    <View style={styles.item}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {round(value)} / {round(goal)} {unit}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: fill, backgroundColor: over ? colors.danger : color }]} />
      </View>
    </View>
  );
};

export const NutritionBar = ({ totals, profile }: NutritionBarProps) => (
  <View style={styles.wrap}>
    <ProgressItem
      label="Kalorie"
      value={totals.kcal}
      goal={profile?.goalKcal ?? 0}
      unit="kcal"
      color={colors.kcal}
    />
    <ProgressItem
      label="Białko"
      value={totals.proteinG}
      goal={profile?.goalProteinG ?? 0}
      unit="g"
      color={colors.protein}
    />
    <ProgressItem
      label="Węgle"
      value={totals.carbsG}
      goal={profile?.goalCarbsG ?? 0}
      unit="g"
      color={colors.carbs}
    />
    <ProgressItem
      label="Tłuszcze"
      value={totals.fatG}
      goal={profile?.goalFatG ?? 0}
      unit="g"
      color={colors.fat}
    />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  item: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  value: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  track: {
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
});
