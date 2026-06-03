import { useCallback, useEffect, useState } from "react";
import { Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components/Icon";
import { calculateMealMacros, summarizeMeals, round } from "../core/macroCalculator";
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
    "sty","lut","mar","kwi","maj","cze",
    "lip","sie","wrz","paź","lis","gru",
  ];
  const days = ["Nd","Pn","Wt","Śr","Cz","Pt","So"];
  if (index === 0) return { label: "Dziś", subLabel: `${date.getDate()} ${months[date.getMonth()]}` };
  if (index === 1) return { label: "Wczoraj", subLabel: `${date.getDate()} ${months[date.getMonth()]}` };
  return {
    label: days[date.getDay()],
    subLabel: `${date.getDate()} ${months[date.getMonth()]}`,
  };
}

function MacroTag({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.macroTag}>
      <Text style={[styles.macroTagLetter, { color }]}>{label}</Text>
      <Text style={styles.macroTagValue}>{value}g</Text>
    </View>
  );
}

function MealRow({ item }: { item: MealEntry }) {
  const macros = calculateMealMacros(item, item.weightG);
  return (
    <View style={styles.mealRow}>
      <View style={styles.mealRowLeft}>
        <Text style={styles.mealName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.mealMeta}>{Math.round(item.weightG)} g</Text>
      </View>
      <Text style={styles.mealKcal}>{round(macros.kcal)} kcal</Text>
    </View>
  );
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

  useEffect(() => { void load(); }, [load]);

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
        <Text style={styles.title}>Ostatnie 2 tygodnie</Text>
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
          contentContainerStyle={[styles.list, { paddingBottom: 68 + insets.bottom + 24 }]}
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
                <View style={styles.dateBadge}>
                  <Text style={styles.dateBadgeDay}>{section.label}</Text>
                  <Text style={styles.dateBadgeSub}>{section.subLabel}</Text>
                </View>

                <View style={styles.dayMeta}>
                  {hasFood ? (
                    <>
                      <Text style={styles.dayKcal}>{section.kcal} kcal</Text>
                      <View style={styles.macroRow}>
                        <MacroTag label="B" value={section.proteinG} color={colors.protein} />
                        <MacroTag label="W" value={section.carbsG} color={colors.carbs} />
                        <MacroTag label="T" value={section.fatG} color={colors.fat} />
                      </View>
                    </>
                  ) : (
                    <Text style={styles.emptyDay}>brak posiłków</Text>
                  )}
                </View>

                <Icon
                  name={open ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.muted}
                />
              </Pressable>
            );
          }}
          renderItem={({ item, section }) => {
            if (!expanded.has(section.dateKey)) return null;
            return <MealRow item={item} />;
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

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 4,
  },
  eyebrow: { ...typography.stat, color: colors.accent },
  title: { color: colors.text, fontSize: 30, fontWeight: "900" },

  list: { paddingHorizontal: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  empty: { ...typography.body, color: colors.muted },

  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },

  dateBadge: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 46,
  },
  dateBadgeDay: { color: colors.text, fontSize: 13, fontWeight: "800" },
  dateBadgeSub: { color: colors.muted, fontSize: 10, marginTop: 1 },

  dayMeta: { flex: 1, gap: 4, minWidth: 0 },
  dayKcal: { color: colors.text, fontSize: 15, fontWeight: "800" },
  emptyDay: { color: colors.muted, fontSize: 12 },

  macroRow: { flexDirection: "row", gap: 6 },
  macroTag: { flexDirection: "row", alignItems: "center", gap: 3 },
  macroTagLetter: { fontSize: 10, fontWeight: "800" },
  macroTagValue: { color: colors.mutedMid, fontSize: 10 },

  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 10,
    marginBottom: 2,
    marginHorizontal: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  mealRowLeft: { flex: 1, minWidth: 0, gap: 2 },
  mealName: { ...typography.label, color: colors.text, fontSize: 13 },
  mealMeta: { color: colors.muted, fontSize: 11 },
  mealKcal: { color: colors.mutedMid, fontSize: 12, fontWeight: "700" },

  sectionGap: { height: 10 },
});
