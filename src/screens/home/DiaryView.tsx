import { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "../../components/IconButton";
import { Icon } from "../../components/Icon";
import { calculateMealMacros, summarizeMeals } from "../../core/macroCalculator";
import { SECTIONS, type Section } from "../../core/section";
import type { MealEntry, UserProfile } from "../../data/types";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { sh } from "../../theme/sharedStyles";

const TAB_BAR_HEIGHT = 68;

const SECTION_COLORS: Record<Section, string> = {
  Śniadanie: colors.carbs,   // amber
  Obiad: colors.protein,     // calm blue
  Kolacja: colors.fat,       // soft violet
  Przekąska: colors.green,   // green
};

const MONTHS_SHORT = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
const MONTHS_LONG = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];

function formatDateLabel(offset: number, date: Date) {
  if (offset === 0) return "Dziś";
  if (offset === -1) return "Wczoraj";
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

function formatDateSub(date: Date) {
  return `${date.getDate()} ${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

function MacroBar({ label, current, goal, color }: { label: string; current: number; goal: number; color: string }) {
  const pct = Math.min(goal > 0 ? (current / goal) * 100 : 0, 100);
  return (
    <View style={s.macroWrap}>
      <View style={s.macroRow}>
        <Text style={s.macroLabel}>{label}</Text>
        <Text style={s.macroValue}>
          {Math.round(current)}
          <Text style={s.macroGoal}>/{Math.round(goal)}g</Text>
        </Text>
      </View>
      <View style={s.macroTrack}>
        <View style={[s.macroFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

type Props = {
  meals: MealEntry[];
  dateOffset: number;
  currentDate: Date;
  setDateOffset: (value: number) => void;
  profile: UserProfile | null | undefined;
  onAddFood: (section: Section) => void;
  onRemoveMeal: (id: string) => void;
  onMoveMeal: (id: string, toSection: Section) => void;
  onEditMeal: (meal: MealEntry) => void;
};

export const DiaryView = ({ meals, dateOffset, currentDate, setDateOffset, profile, onAddFood, onRemoveMeal, onMoveMeal, onEditMeal }: Props) => {
  const insets = useSafeAreaInsets();
  const totals = useMemo(() => {
    const summary = summarizeMeals(meals);
    return {
      kcal: Math.round(summary.kcal),
      protein: Math.round(summary.proteinG * 10) / 10,
      carbs: Math.round(summary.carbsG * 10) / 10,
      fat: Math.round(summary.fatG * 10) / 10,
    };
  }, [meals]);

  const goalKcal = profile?.goalKcal ?? 2200;
  const goalProtein = profile?.goalProteinG ?? 150;
  const goalCarbs = profile?.goalCarbsG ?? 270;
  const goalFat = profile?.goalFatG ?? 73;
  const remaining = goalKcal - totals.kcal;
  const pctKcal = Math.min((totals.kcal / goalKcal) * 100, 100);

  const mealsBySection = useMemo(() => (
    Object.fromEntries(
      SECTIONS.map((section) => [
        section,
        meals.filter((m) => m.section === section || (section === "Przekąska" && !m.section)),
      ]),
    ) as Record<Section, MealEntry[]>
  ), [meals]);

  return (
    <ScrollView
      contentContainerStyle={[s.scroll, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Date navigation */}
      <View style={s.dateRow}>
        <IconButton icon="chevron-left" label="Poprzedni dzień" onPress={() => setDateOffset(dateOffset - 1)} />
        <Pressable
          style={({ pressed }) => [s.dateCenter, pressed && { opacity: 0.7 }]}
          onPress={() => dateOffset !== 0 && setDateOffset(0)}
          accessibilityRole="button"
          accessibilityLabel="Wróć do dzisiaj"
        >
          <Text style={s.dateLabel}>{formatDateLabel(dateOffset, currentDate)}</Text>
          <Text style={s.dateSub}>{formatDateSub(currentDate)}</Text>
          {dateOffset !== 0 ? <Text style={s.todayPill}>Dziś →</Text> : null}
        </Pressable>
        <IconButton
          icon="chevron-right"
          label="Następny dzień"
          disabled={dateOffset >= 0}
          onPress={() => setDateOffset(dateOffset + 1)}
        />
      </View>

      {/* Summary card */}
      <View style={s.summaryCard}>
        <Text style={s.cardLabel}>Kalorie</Text>
        <View style={s.kcalRow}>
          <Text style={s.kcalBig}>{totals.kcal}</Text>
          <View style={s.kcalSide}>
            <Text style={s.kcalGoal}>z {Math.round(goalKcal)} kcal</Text>
            <Text style={[s.remaining, { color: remaining >= 0 ? colors.green : colors.danger }]}>
              {remaining >= 0 ? `${remaining} pozostało` : `${Math.abs(remaining)} za dużo`}
            </Text>
          </View>
        </View>
        <View style={s.kcalTrack}>
          <View style={[s.kcalFill, { width: `${pctKcal}%`, backgroundColor: pctKcal >= 100 ? colors.danger : colors.accent }]} />
        </View>
        <View style={s.macroStack}>
          <MacroBar label="Białko" current={totals.protein} goal={goalProtein} color={colors.protein} />
          <MacroBar label="Węglowodany" current={totals.carbs} goal={goalCarbs} color={colors.carbs} />
          <MacroBar label="Tłuszcze" current={totals.fat} goal={goalFat} color={colors.fat} />
        </View>
      </View>

      {/* Sections timeline */}
      <View style={s.timeline}>
        {SECTIONS.map((section, index) => {
          const sectionMeals = mealsBySection[section] ?? [];
          const sectionKcal = sectionMeals.reduce(
            (sum, m) => sum + Math.round(calculateMealMacros(m, m.weightG).kcal),
            0,
          );
          const dot = SECTION_COLORS[section];
          const last = index === SECTIONS.length - 1;

          return (
            <View key={section} style={s.timelineRow}>
              <View style={s.spine}>
                <View style={[s.dot, { backgroundColor: dot }]} />
                {!last ? <View style={[s.line, { backgroundColor: `${dot}55` }]} /> : null}
              </View>
              <View style={[s.section, last && { paddingBottom: 4 }]}>
                <View style={s.sectionHeader}>
                  <View style={s.sectionTitleRow}>
                    <Text style={s.sectionTitle}>{section}</Text>
                    {sectionKcal > 0 ? (
                      <View style={[s.kcalPill, { backgroundColor: `${dot}22` }]}>
                        <Text style={[s.kcalPillText, { color: dot }]}>{sectionKcal} kcal</Text>
                      </View>
                    ) : null}
                  </View>
                  <IconButton icon="plus" label={`Dodaj do ${section}`} tone="accent" onPress={() => onAddFood(section)} />
                </View>

                {sectionMeals.length > 0 ? (
                  <View style={s.foodList}>
                    {sectionMeals.map((meal, mealIndex) => {
                      const macros = calculateMealMacros(meal, meal.weightG);
                      return (
                        <Pressable
                          key={meal.id}
                          style={({ pressed }) => [s.foodRow, mealIndex > 0 && s.foodBorder, pressed && { opacity: 0.75 }]}
                          onPress={() => onEditMeal(meal)}
                          onLongPress={() => {
                            const targets = SECTIONS.filter((sec) => sec !== section);
                            Alert.alert(meal.name, "Przenieś do:", [
                              ...targets.map((sec) => ({ text: sec, onPress: () => onMoveMeal(meal.id, sec) })),
                              { text: "Anuluj", style: "cancel" as const },
                            ]);
                          }}
                          delayLongPress={400}
                        >
                          <View style={s.foodIcon}>
                            <Icon
                              name={meal.source === "barcode" ? "barcode" : meal.source === "photo" ? "camera" : "utensils"}
                              size={17}
                              color={colors.accent}
                            />
                          </View>
                          <View style={s.foodText}>
                            <Text style={s.foodName} numberOfLines={1}>{meal.name}</Text>
                            <Text style={s.foodSub}>{Math.round(meal.weightG)} g</Text>
                          </View>
                          <Text style={s.foodKcal}>{Math.round(macros.kcal)} kcal</Text>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Usuń ${meal.name}`}
                            style={({ pressed }) => [s.remove, pressed && sh.pressed]}
                            onPress={() => onRemoveMeal(meal.id)}
                          >
                            <Icon name="x" size={14} color={colors.muted} />
                          </Pressable>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Dodaj produkt do ${section}`}
                    style={({ pressed }) => [s.emptyFood, pressed && sh.pressed]}
                    onPress={() => onAddFood(section)}
                  >
                    <Icon name="plus" size={14} color={colors.mutedMid} />
                    <Text style={s.emptyFoodText}>Dodaj produkt</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },
  dateRow: { alignItems: "center", flexDirection: "row", paddingVertical: 8 },
  dateCenter: { alignItems: "center", flex: 1 },
  dateLabel: { fontFamily: "Inter_700Bold", fontSize: 20, color: colors.text, lineHeight: 26 },
  dateSub: { ...typography.stat, color: colors.muted, marginTop: 1 },
  todayPill: { ...typography.stat, color: colors.accent, marginTop: 4 },
  summaryCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, marginBottom: 14, padding: 18 },
  cardLabel: { ...typography.label, color: colors.muted },
  kcalRow: { alignItems: "flex-end", flexDirection: "row", gap: 9, marginBottom: 10 },
  kcalBig: { ...typography.display, color: colors.text },
  kcalSide: { gap: 2, paddingBottom: 7 },
  kcalGoal: { ...typography.label, color: colors.muted },
  remaining: { ...typography.label },
  kcalTrack: { backgroundColor: colors.border, borderRadius: 3, height: 5, overflow: "hidden" },
  kcalFill: { borderRadius: 3, height: "100%" },
  macroStack: { marginTop: 16 },
  macroWrap: { marginBottom: 8 },
  macroRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  macroLabel: { ...typography.label, color: colors.mutedMid },
  macroValue: { ...typography.label, color: colors.text },
  macroGoal: { color: colors.muted },
  macroTrack: { backgroundColor: colors.border, borderRadius: 3, height: 5, overflow: "hidden" },
  macroFill: { borderRadius: 3, height: "100%" },
  timeline: { paddingLeft: 4 },
  timelineRow: { flexDirection: "row", gap: 14 },
  spine: { alignItems: "center", width: 18 },
  dot: { borderRadius: 7, height: 12, marginTop: 7, width: 12 },
  line: { borderRadius: 1, flex: 1, marginTop: 4, minHeight: 30, width: 2 },
  section: { flex: 1, paddingBottom: 22 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  sectionTitleRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  sectionTitle: { ...typography.label, color: colors.text, fontSize: 13 },
  kcalPill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  kcalPillText: { ...typography.label, fontSize: 11 },
  foodList: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  foodRow: { alignItems: "center", flexDirection: "row", gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  foodBorder: { borderTopColor: colors.border, borderTopWidth: 1 },
  foodIcon: { alignItems: "center", height: 28, justifyContent: "center", width: 28 },
  foodText: { flex: 1, minWidth: 0 },
  foodName: { ...typography.label, color: colors.text, fontSize: 13 },
  foodSub: { ...typography.label, color: colors.muted, fontSize: 11, marginTop: 2 },
  foodKcal: { ...typography.label, color: colors.mutedMid, fontSize: 12 },
  remove: { alignItems: "center", height: 32, justifyContent: "center", width: 26 },
  emptyFood: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderStyle: "dashed", borderWidth: 1.5, flexDirection: "row", gap: 8, paddingHorizontal: 13, paddingVertical: 10 },
  emptyFoodText: { ...typography.label, color: colors.muted },
});
