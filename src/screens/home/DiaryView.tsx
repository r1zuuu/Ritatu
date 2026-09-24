import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AnimatedBar } from "../../components/AnimatedBar";
import { FAB_CLEARANCE } from "../../components/BottomTabBar";
import { Card } from "../../components/Card";
import { IconButton } from "../../components/IconButton";
import { Icon } from "../../components/Icon";
import { addDays, daysFromToday, formatDayLabel, startOfWeek, toDateKey } from "../../core/date";
import { calculateMealMacros, isDayCounted, summarizeMeals } from "../../core/macroCalculator";
import { getSectionByTime, SECTION_GENITIVE, SECTIONS, type Section } from "../../core/section";
import { getDayTotals } from "../../data/mealRepository";
import type { MealEntry, UserProfile } from "../../data/types";
import { useAuth } from "../../providers/AuthProvider";
import { colors } from "../../theme/colors";
import { radius, space } from "../../theme/layout";
import { fontFamilies, typography } from "../../theme/typography";

const MONTHS_LONG = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
const WEEKDAYS = ["pn", "wt", "śr", "cz", "pt", "sb", "nd"];

const formatDateSub = (date: Date) => `${date.getDate()} ${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;

function MacroBar({ label, current, goal, color, delay }: { label: string; current: number; goal: number; color: string; delay: number }) {
  const pct = Math.min(goal > 0 ? (current / goal) * 100 : 0, 100);
  return (
    <View style={s.macroWrap}>
      <View style={s.macroRow}>
        <Text style={s.macroLabel}>{label}</Text>
        <Text style={s.macroValue}>
          {Math.round(current)}
          <Text style={s.macroGoal}> / {Math.round(goal)} g</Text>
        </Text>
      </View>
      <AnimatedBar pct={pct} color={color} height={6} delay={delay} />
    </View>
  );
}

// Mon–Sun of the shown week. A dot marks days with meals, so gaps are visible
// at a glance; tapping a day jumps straight to it.
function WeekStrip({
  selected,
  dateOffset,
  minKcal,
  mealsKey,
  onSelect,
}: {
  selected: Date;
  dateOffset: number;
  minKcal: number | null;
  mealsKey: string;
  onSelect: (offset: number) => void;
}) {
  const { user } = useAuth();
  const monday = startOfWeek(selected);
  const mondayKey = toDateKey(monday);
  const [kcalByDay, setKcalByDay] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const dates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
      void getDayTotals(user.uid, dates).then((totals) => {
        if (active) setKcalByDay(Object.fromEntries(totals.map((t) => [t.dateKey, t.kcal])));
      });
      return () => { active = false; };
      // mealsKey changes when the shown day's meals change, so its dot updates.
    }, [mondayKey, mealsKey, user.uid]),
  );

  return (
    <View style={s.strip}>
      {WEEKDAYS.map((label, i) => {
        const date = addDays(monday, i);
        const offset = daysFromToday(date);
        const isSelected = offset === dateOffset;
        const kcal = kcalByDay[toDateKey(date)] ?? 0;
        const future = offset > 0;
        return (
          <Pressable
            key={label}
            disabled={future}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={formatDayLabel(offset, date)}
            style={({ pressed }) => [s.stripDay, isSelected && s.stripDaySelected, pressed && s.pressed, future && s.stripFuture]}
            onPress={() => onSelect(offset)}
          >
            <Text style={[s.stripWeekday, isSelected && s.stripTextSelected]}>{label}</Text>
            <Text style={[s.stripNumber, offset === 0 && !isSelected && s.stripToday, isSelected && s.stripTextSelected]}>
              {date.getDate()}
            </Text>
            <View
              style={[
                s.stripDot,
                kcal > 0 && s.stripDotLogged,
                kcal > 0 && offset < 0 && !isDayCounted(kcal, minKcal) && s.stripDotSkipped,
                isSelected && kcal > 0 && s.stripDotOnSelected,
              ]}
            />
          </Pressable>
        );
      })}
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
  onEditMeal: (meal: MealEntry) => void;
};

export const DiaryView = ({ meals, dateOffset, currentDate, setDateOffset, profile, onAddFood, onEditMeal }: Props) => {
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
  // Only finished days: today is still being logged.
  const minKcal = profile?.minCountedKcal ?? null;
  const skipped = dateOffset < 0 && totals.kcal > 0 && !isDayCounted(totals.kcal, minKcal);
  const pctKcal = Math.min((totals.kcal / goalKcal) * 100, 100);
  // The meal happening now gets the only accent on the timeline.
  const currentSection = dateOffset === 0 ? getSectionByTime() : null;
  const mealsKey = meals.map((m) => m.id).join(",");

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
      contentContainerStyle={[s.scroll, { paddingBottom: FAB_CLEARANCE }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.dateRow}>
        <IconButton icon="chevron-left" label="Poprzedni dzień" onPress={() => setDateOffset(dateOffset - 1)} />
        <View style={s.dateCenter}>
          <Text style={s.dateLabel}>{formatDayLabel(dateOffset, currentDate)}</Text>
          <Text style={s.dateSub}>{formatDateSub(currentDate)}</Text>
        </View>
        <IconButton
          icon="chevron-right"
          label="Następny dzień"
          disabled={dateOffset >= 0}
          onPress={() => setDateOffset(dateOffset + 1)}
        />
      </View>

      <WeekStrip
        selected={currentDate}
        dateOffset={dateOffset}
        minKcal={minKcal}
        mealsKey={mealsKey}
        onSelect={setDateOffset}
      />

      {dateOffset !== 0 ? (
        <Pressable accessibilityRole="button" style={s.todayLink} onPress={() => setDateOffset(0)} hitSlop={8}>
          <Icon name="undo" size={14} color={colors.accent} />
          <Text style={s.todayLinkText}>Wróć do dziś</Text>
        </Pressable>
      ) : null}

      {skipped ? (
        <View style={s.skippedChip}>
          <Icon name="info" size={16} color={colors.mutedMid} />
          <Text style={s.skippedText}>
            Dzień nieliczony: poniżej progu {Math.round(minKcal ?? 0)} kcal, poza średnimi i serią.
          </Text>
        </View>
      ) : null}

      <Animated.View entering={FadeInDown.duration(320)}>
        <Card variant="hero" style={s.summaryCard}>
          <Text style={s.cardLabel}>Kalorie</Text>
          <View style={s.kcalRow}>
            <Text style={s.kcalBig}>{totals.kcal}</Text>
            <View style={s.kcalSide}>
              <Text style={s.kcalGoal}>z {Math.round(goalKcal)} kcal</Text>
              <Text style={[s.remaining, { color: remaining >= 0 ? colors.green : colors.danger }]}>
                {remaining >= 0 ? `${remaining} pozostało` : `${Math.abs(remaining)} ponad cel`}
              </Text>
            </View>
          </View>
          <AnimatedBar pct={pctKcal} color={pctKcal >= 100 ? colors.danger : colors.accent} height={7} delay={120} />
          <View style={s.macroStack}>
            <MacroBar label="Białko" current={totals.protein} goal={goalProtein} color={colors.protein} delay={180} />
            <MacroBar label="Węglowodany" current={totals.carbs} goal={goalCarbs} color={colors.carbs} delay={220} />
            <MacroBar label="Tłuszcze" current={totals.fat} goal={goalFat} color={colors.fat} delay={260} />
          </View>
        </Card>
      </Animated.View>

      <View style={s.timeline}>
        {SECTIONS.map((section, index) => {
          const sectionMeals = mealsBySection[section] ?? [];
          const sectionKcal = sectionMeals.reduce(
            (sum, m) => sum + Math.round(calculateMealMacros(m, m.weightG).kcal),
            0,
          );
          const isCurrent = section === currentSection;
          const last = index === SECTIONS.length - 1;

          return (
            <Animated.View key={section} entering={FadeInDown.delay(80 + index * 50).duration(320)} style={s.timelineRow}>
              <View style={s.spine}>
                <View style={[s.dot, (sectionMeals.length > 0 || isCurrent) && s.dotFilled, isCurrent && s.dotCurrent]} />
                {!last ? <View style={s.line} /> : null}
              </View>
              <View style={[s.section, last && { paddingBottom: 4 }]}>
                <View style={s.sectionHeader}>
                  <View style={s.sectionTitleRow}>
                    <Text style={[s.sectionTitle, isCurrent && s.sectionTitleCurrent]}>{section}</Text>
                    {sectionKcal > 0 ? <Text style={s.sectionKcal}>{sectionKcal} kcal</Text> : null}
                  </View>
                  <IconButton icon="plus" label={`Dodaj do ${SECTION_GENITIVE[section]}`} tone="accent" onPress={() => onAddFood(section)} />
                </View>

                {sectionMeals.length > 0 ? (
                  <Card variant="elevated" style={s.foodList}>
                    {sectionMeals.map((meal, mealIndex) => {
                      const macros = calculateMealMacros(meal, meal.weightG);
                      return (
                        <Pressable
                          key={meal.id}
                          accessibilityRole="button"
                          accessibilityLabel={`${meal.name}, ${Math.round(macros.kcal)} kcal`}
                          accessibilityHint="Otwiera edycję posiłku"
                          style={({ pressed }) => [s.foodRow, mealIndex > 0 && s.foodBorder, pressed && s.rowPressed]}
                          onPress={() => onEditMeal(meal)}
                        >
                          {meal.photoUrl ? (
                            <Image source={{ uri: meal.photoUrl }} style={s.foodThumb} />
                          ) : (
                            <View style={s.foodIcon}>
                              <Icon
                                name={meal.source === "barcode" ? "barcode" : meal.source === "photo" ? "camera" : meal.source === "quick" ? "flame" : "utensils"}
                                size={18}
                                color={colors.mutedMid}
                              />
                            </View>
                          )}
                          <View style={s.foodText}>
                            <Text style={s.foodName} numberOfLines={1}>{meal.name}</Text>
                            <Text style={s.foodSub}>
                              {meal.source === "quick" ? "szybkie kcal" : `${Math.round(meal.weightG)} g`}
                              {" · "}B {Math.round(macros.proteinG)} · W {Math.round(macros.carbsG)} · T {Math.round(macros.fatG)}
                            </Text>
                          </View>
                          <Text style={s.foodKcal}>{Math.round(macros.kcal)}</Text>
                        </Pressable>
                      );
                    })}
                  </Card>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Dodaj produkt do ${SECTION_GENITIVE[section]}`}
                    style={({ pressed }) => [s.emptyFood, pressed && s.rowPressed]}
                    onPress={() => onAddFood(section)}
                  >
                    <Icon name="plus" size={16} color={colors.mutedMid} />
                    <Text style={s.emptyFoodText}>Dodaj do {SECTION_GENITIVE[section]}</Text>
                  </Pressable>
                )}
              </View>
            </Animated.View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl },
  pressed: { opacity: 0.7 },
  rowPressed: { backgroundColor: colors.cardHov },

  dateRow: { alignItems: "center", flexDirection: "row", paddingTop: space.sm },
  dateCenter: { alignItems: "center", flex: 1 },
  dateLabel: { ...typography.headline, color: colors.text },
  dateSub: { ...typography.caption, color: colors.mutedMid },

  strip: { flexDirection: "row", gap: 6, marginBottom: space.md, marginTop: space.md },
  stripDay: { alignItems: "center", borderRadius: radius.control, flex: 1, gap: 2, paddingVertical: 8 },
  stripDaySelected: { backgroundColor: colors.accent },
  stripFuture: { opacity: 0.35 },
  stripWeekday: { ...typography.micro, color: colors.mutedMid },
  stripNumber: { ...typography.label, color: colors.text, fontSize: 15, fontVariant: ["tabular-nums"] },
  stripToday: { color: colors.accent },
  stripTextSelected: { color: colors.warmBlack },
  stripDot: { borderRadius: 2, height: 4, marginTop: 2, width: 4 },
  stripDotLogged: { backgroundColor: colors.mutedMid },
  stripDotSkipped: { backgroundColor: "transparent", borderColor: colors.mutedMid, borderWidth: 1 },
  stripDotOnSelected: { backgroundColor: colors.warmBlack, borderColor: colors.warmBlack },

  todayLink: { alignItems: "center", alignSelf: "center", flexDirection: "row", gap: 6, marginBottom: space.md, minHeight: 32 },
  todayLinkText: { ...typography.label, color: colors.accent },

  skippedChip: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.control,
    flexDirection: "row",
    gap: 8,
    marginBottom: space.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  skippedText: { ...typography.caption, color: colors.mutedMid, flex: 1 },

  summaryCard: { marginBottom: space.xl, padding: 20 },
  cardLabel: { ...typography.label, color: colors.mutedMid },
  kcalRow: { alignItems: "flex-end", flexDirection: "row", gap: 10, marginBottom: 12 },
  kcalBig: { ...typography.display, color: colors.text },
  kcalSide: { gap: 2, paddingBottom: 7 },
  kcalGoal: { ...typography.label, color: colors.mutedMid },
  remaining: { ...typography.label },
  macroStack: { marginTop: 18 },
  macroWrap: { marginBottom: 10 },
  macroRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  macroLabel: { ...typography.label, color: colors.mutedMid },
  macroValue: { ...typography.label, color: colors.text, fontVariant: ["tabular-nums"] },
  macroGoal: { color: colors.mutedMid, fontFamily: fontFamilies.regular },

  timeline: { paddingLeft: 2 },
  timelineRow: { flexDirection: "row", gap: 14 },
  spine: { alignItems: "center", width: 14 },
  dot: { borderColor: colors.borderMid, borderRadius: 6, borderWidth: 2, height: 12, marginTop: 12, width: 12 },
  dotFilled: { backgroundColor: colors.borderMid },
  dotCurrent: { backgroundColor: colors.accent, borderColor: colors.accent },
  line: { backgroundColor: colors.border, borderRadius: 1, flex: 1, marginTop: 4, minHeight: 30, width: 2 },
  section: { flex: 1, paddingBottom: space.xl },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: space.sm },
  sectionTitleRow: { alignItems: "baseline", flexDirection: "row", gap: 10 },
  sectionTitle: { ...typography.section, color: colors.text, fontSize: 16 },
  sectionTitleCurrent: { color: colors.accent },
  sectionKcal: { ...typography.caption, color: colors.mutedMid, fontVariant: ["tabular-nums"] },

  foodList: { borderRadius: radius.lg, overflow: "hidden" },
  foodRow: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 60, paddingHorizontal: 14, paddingVertical: 10 },
  foodBorder: { borderTopColor: colors.border, borderTopWidth: 1 },
  foodIcon: { alignItems: "center", backgroundColor: colors.surfaceAlt, borderRadius: 10, height: 40, justifyContent: "center", width: 40 },
  foodThumb: { backgroundColor: colors.surfaceAlt, borderRadius: 10, height: 40, width: 40 },
  foodText: { flex: 1, minWidth: 0 },
  foodName: { ...typography.body, color: colors.text, fontFamily: fontFamilies.medium },
  foodSub: { ...typography.micro, color: colors.mutedMid, fontSize: 12, marginTop: 2 },
  foodKcal: { ...typography.label, color: colors.text, fontSize: 15, fontVariant: ["tabular-nums"] },

  emptyFood: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderStyle: "dashed",
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  emptyFoodText: { ...typography.label, color: colors.mutedMid },
});
