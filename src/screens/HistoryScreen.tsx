import { useCallback, useEffect, useState } from "react";
import { Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components/Icon";
import { summarizeMeals, round } from "../core/macroCalculator";
import { toDateKey } from "../core/date";
import { getCachedMealsForDay } from "../data/mealRepository";
import type { MealEntry } from "../data/types";
import { useAuth } from "../providers/AuthProvider";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

const DAYS_BACK = 14;

type DaySection = {
  dateKey: string;
  label: string;
  subLabel: string;
  data: MealEntry[];
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

function buildLabel(date: Date, index: number): { label: string; subLabel: string } {
  const months = [
    "stycznia","lutego","marca","kwietnia","maja","czerwca",
    "lipca","sierpnia","września","października","listopada","grudnia",
  ];
  const days = ["Niedziela","Poniedziałek","Wtorek","Środa","Czwartek","Piątek","Sobota"];
  if (index === 0) return { label: "Dziś", subLabel: `${date.getDate()} ${months[date.getMonth()]}` };
  if (index === 1) return { label: "Wczoraj", subLabel: `${date.getDate()} ${months[date.getMonth()]}` };
  return {
    label: days[date.getDay()],
    subLabel: `${date.getDate()} ${months[date.getMonth()]}`,
  };
}

export const HistoryScreen = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [sections, setSections] = useState<DaySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["0"]));

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const today = new Date();
    const results: DaySection[] = [];

    for (let i = 0; i < DAYS_BACK; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const meals = await getCachedMealsForDay(user.uid, date);
      const totals = summarizeMeals(meals);
      const { label, subLabel } = buildLabel(date, i);
      results.push({
        dateKey: toDateKey(date),
        label,
        subLabel,
        data: meals,
        kcal: Math.round(totals.kcal),
        proteinG: Math.round(totals.proteinG * 10) / 10,
        carbsG: Math.round(totals.carbsG * 10) / 10,
        fatG: Math.round(totals.fatG * 10) / 10,
      });
    }

    setSections(results.filter((s) => s.data.length > 0 || s.dateKey === toDateKey(today)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (dateKey: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Historia</Text>
        <Text style={styles.title}>Ostatnie {DAYS_BACK} dni</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Ładowanie...</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.center}>
          <Icon name="clipboard" size={32} color={colors.muted} />
          <Text style={styles.empty}>Brak zapisanych posiłków</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => {
            const open = expanded.has(section.dateKey);
            const hasFood = section.data.length > 0;
            return (
              <Pressable
                style={({ pressed }) => [styles.dayHeader, pressed && styles.pressed]}
                onPress={() => toggle(section.dateKey)}
              >
                <View style={styles.dayLeft}>
                  <Text style={styles.dayLabel}>{section.label}</Text>
                  <Text style={styles.daySub}>{section.subLabel}</Text>
                </View>
                {hasFood ? (
                  <View style={styles.dayRight}>
                    <View style={styles.dayTopRow}>
                      <View style={styles.dayKcalPill}>
                        <Text style={styles.dayKcal}>{section.kcal} kcal</Text>
                      </View>
                      <Icon name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
                    </View>
                    <View style={styles.dayMacros}>
                      <Text style={styles.dayMacroText}>
                        <Text style={{ color: colors.protein }}>B</Text> {section.proteinG}g
                      </Text>
                      <Text style={styles.dayMacroText}>
                        <Text style={{ color: colors.carbs }}>W</Text> {section.carbsG}g
                      </Text>
                      <Text style={styles.dayMacroText}>
                        <Text style={{ color: colors.fat }}>T</Text> {section.fatG}g
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Icon name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
                )}
              </Pressable>
            );
          }}
          renderItem={({ item, section }) => {
            if (!expanded.has(section.dateKey)) return null;
            const kcal = Math.round(
              (item.proteinPer100g * 4 + item.carbsPer100g * 4 + item.fatPer100g * 9) *
                (item.weightG / 100),
            );
            return (
              <View style={styles.mealRow}>
                <View style={styles.mealDot} />
                <View style={styles.mealText}>
                  <Text style={styles.mealName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.mealMeta}>{Math.round(item.weightG)} g</Text>
                </View>
                <Text style={styles.mealKcal}>{kcal} kcal</Text>
              </View>
            );
          }}
          renderSectionFooter={({ section }) => {
            if (!expanded.has(section.dateKey) || section.data.length === 0) return null;
            return <View style={styles.sectionGap} />;
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.background, flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 4 },
  eyebrow: { ...typography.label, color: colors.accent, textTransform: "uppercase" },
  title: { color: colors.text, fontSize: 30, fontWeight: "900" },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  empty: { ...typography.body, color: colors.muted },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  dayLeft: { flex: 1, gap: 2, minWidth: 0 },
  dayLabel: { color: colors.text, fontSize: 14, fontWeight: "800" },
  daySub: { color: colors.muted, fontSize: 11 },
  dayRight: { alignItems: "flex-end", gap: 4, flexShrink: 0 },
  dayTopRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dayKcalPill: {
    backgroundColor: colors.accentA,
    borderColor: colors.accentB,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dayKcal: { color: colors.accent, fontSize: 12, fontWeight: "800" },
  dayMacros: { flexDirection: "row", gap: 6 },
  dayMacroText: { color: colors.mutedMid, fontSize: 10 },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: colors.surface,
    marginBottom: 1,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    marginLeft: 8,
  },
  mealDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderMid,
  },
  mealText: { flex: 1, minWidth: 0 },
  mealName: { ...typography.label, color: colors.text, fontSize: 13 },
  mealMeta: { ...typography.label, color: colors.muted, fontSize: 11, marginTop: 1 },
  mealKcal: { ...typography.label, color: colors.mutedMid, fontSize: 12 },
  sectionGap: { height: 8 },
});
