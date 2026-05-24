import { DimensionValue, StyleSheet, Text, View, Animated } from "react-native";
import { useEffect, useRef } from "react";
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
  const fillWidth = Math.min(ratio, 1) * 100;

  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: fillWidth,
      duration: 500,
      useNativeDriver: false, // width animation doesn't support native driver
    }).start();
  }, [fillWidth]);

  return (
    <View style={styles.item}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {round(value)}<Text style={styles.goalText}> / {round(goal)}</Text>
      </Text>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%']
              }),
              backgroundColor: over ? colors.danger : color
            }
          ]}
        />
      </View>
    </View>
  );
};

export const NutritionBar = ({ totals, profile }: NutritionBarProps) => (
  <View style={styles.wrap}>
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
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  item: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  goalText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
});
