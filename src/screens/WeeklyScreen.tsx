import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { AnimatedBar } from "../components/AnimatedBar";
import { FAB_CLEARANCE } from "../components/BottomTabBar";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Icon } from "../components/Icon";
import { IconButton } from "../components/IconButton";
import { Screen } from "../components/Screen";
import { addDays, daysFromToday, startOfDay, startOfWeek, toDateKey } from "../core/date";
import { goalStatus, isDayCounted, round } from "../core/macroCalculator";
import { getDayTotals, type DayTotals } from "../data/mealRepository";
import { useAuth } from "../providers/AuthProvider";
import { useMeals } from "../providers/MealsProvider";
import { useUserProfile } from "../providers/UserProfileProvider";
import { colors } from "../theme/colors";
import { radius, space } from "../theme/layout";
import { typography } from "../theme/typography";

const DAY_LABELS = ["pn", "wt", "śr", "cz", "pt", "sb", "nd"];
const BAR_H = 96;
// How far back the streak looks. A longer streak shows as "120+".
const STREAK_WINDOW = 120;

type Day = DayTotals & { date: Date; isFuture: boolean; isToday: boolean; counted: boolean };

const weekRange = (monday: Date) => {
  const fmt = (d: Date) => new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short" }).format(d);
  return `${fmt(monday)} – ${fmt(addDays(monday, 6))}`;
};

const weekTitle = (offset: number) =>
  offset === 0 ? "Ten tydzień" : offset === -1 ? "Zeszły tydzień" : `${-offset} tyg. temu`;

const dayWord = (n: number) => (n === 1 ? "dzień" : "dni");

// Grows up from the baseline by sliding a full-height bar out of its track,
// so the rounded top keeps its shape (scaleY would squash it).
function WeeklyBar({ pct, color, delay }: { pct: number; color: string; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(Math.max(pct, 0.04), { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [delay, p, pct]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - p.value) * BAR_H }] }));
  return <Animated.View style={[s.barFill, { backgroundColor: color }, style]} />;
}

function MacroRow({ label, avg, goal, color, delay }: { label: string; avg: number; goal: number; color: string; delay: number }) {
  const pct = goal > 0 ? Math.min((avg / goal) * 100, 100) : 0;
  const over = goal > 0 && avg > goal * 1.1;
  return (
    <View style={s.macroRow}>
      <View style={s.macroTop}>
        <Text style={s.macroLabel}>{label}</Text>
        <Text style={s.macroVal}>
          {round(avg)} g
          <Text style={s.macroGoal}> / {round(goal)} g</Text>
        </Text>
      </View>
      <View style={s.macroTrackWrap}>
        <View style={s.macroTrackFlex}>
          <AnimatedBar pct={pct} color={over ? colors.danger : color} height={6} delay={delay} track={colors.surfaceAlt} />
        </View>
        <Text style={[s.macroPct, over && { color: colors.danger }]}>{Math.round(pct)}%</Text>
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={s.legendItem}>
      <View style={[s.legendDot, { backgroundColor: color }]} />
      <Text style={s.legendText}>{label}</Text>
    </View>
  );
}

export const WeeklyScreen = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { setDateOffset } = useMeals();
  const [weekOffset, setWeekOffset] = useState(0);
  const [days, setDays] = useState<Day[] | null>(null);
  const [streak, setStreak] = useState(0);

  const goalKcal = profile?.goalKcal ?? null;
  const goalProtein = profile?.goalProteinG ?? null;
  const goalCarbs = profile?.goalCarbsG ?? null;
  const goalFat = profile?.goalFatG ?? null;
  const minKcal = profile?.minCountedKcal ?? null;
  const monday = startOfWeek(addDays(new Date(), weekOffset * 7));
  // Part of the reload key, so a week left open past midnight moves on.
  const todayKey = toDateKey(new Date());

  // The tab stays mounted, so reload on focus to pick up meals added elsewhere.
  // Old data stays on screen while the next week loads: local reads are fast
  // and a spinner would only flash.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const today = startOfDay(new Date());
      const weekDates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
      const streakDates = Array.from({ length: STREAK_WINDOW }, (_, i) => addDays(today, -i));

      void Promise.all([getDayTotals(user.uid, weekDates), getDayTotals(user.uid, streakDates)]).then(
        ([week, recent]) => {
          if (!active) return;
          setDays(
            week.map((totals, i) => ({
              ...totals,
              date: weekDates[i],
              isFuture: weekDates[i] > today,
              isToday: totals.dateKey === toDateKey(today),
              counted: isDayCounted(totals.kcal, minKcal),
            })),
          );
          // Today is still in progress: an empty or not-yet-counted today
          // must not reset the streak, so start from yesterday then.
          let i = isDayCounted(recent[0].kcal, minKcal) ? 0 : 1;
          let count = 0;
          while (i < recent.length && isDayCounted(recent[i].kcal, minKcal)) { count++; i++; }
          setStreak(count);
        },
      );
      return () => { active = false; };
      // monday is derived from weekOffset and todayKey, so those are the dependencies.
    }, [user.uid, weekOffset, minKcal, todayKey]),
  );

  const openDay = (date: Date) => {
    setDateOffset(daysFromToday(date));
    router.navigate("/home");
  };

  const pastDays = (days ?? []).filter((d) => !d.isFuture);
  const loggedDays = pastDays.filter((d) => d.kcal > 0);
  const countedDays = pastDays.filter((d) => d.counted);
  const skippedDays = loggedDays.filter((d) => !d.counted && !d.isToday);
  const metDays = goalKcal ? countedDays.filter((d) => goalStatus(d.kcal, goalKcal) === "met") : [];

  // Averages use finished, counted days only: today is in progress and a
  // skipped day would drag every number down.
  const completedDays = countedDays.filter((d) => !d.isToday);
  const averageOf = (pick: (day: Day) => number) =>
    completedDays.length ? completedDays.reduce((sum, d) => sum + pick(d), 0) / completedDays.length : 0;
  const avgKcal = averageOf((d) => d.kcal);
  const avgProtein = averageOf((d) => d.proteinG);
  const avgCarbs = averageOf((d) => d.carbsG);
  const avgFat = averageOf((d) => d.fatG);
  const totalKcal = countedDays.reduce((sum, d) => sum + d.kcal, 0);

  type Insight = { macro: string; color: string; pct: number };
  const insights: Insight[] = [];
  if (completedDays.length > 0) {
    if (goalProtein && avgProtein / goalProtein < 0.8) insights.push({ macro: "białka", color: colors.protein, pct: Math.round((avgProtein / goalProtein) * 100) });
    if (goalCarbs && avgCarbs / goalCarbs < 0.8) insights.push({ macro: "węglowodanów", color: colors.carbs, pct: Math.round((avgCarbs / goalCarbs) * 100) });
    if (goalFat && avgFat / goalFat < 0.8) insights.push({ macro: "tłuszczów", color: colors.fat, pct: Math.round((avgFat / goalFat) * 100) });
  }

  // Bars scale to the larger of the best day and the goal (with headroom),
  // so the goal line never sits on the top edge.
  const maxVal = Math.max(...(days ?? []).map((d) => d.kcal), (goalKcal ?? 0) * 1.15, 1);
  const goalPct = goalKcal ? goalKcal / maxVal : null;

  const barColor = (day: Day) => {
    if (day.isToday) return colors.accent;
    if (!day.counted) return colors.borderMid;
    if (!goalKcal) return colors.mutedMid;
    const status = goalStatus(day.kcal, goalKcal);
    return status === "met" ? colors.green : status === "over" ? colors.danger : colors.mutedMid;
  };

  return (
    <Screen noBottomInset padded={false}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: FAB_CLEARANCE }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <View style={s.headerText}>
            <Text style={s.eyebrow}>Statystyki</Text>
            <Text style={s.title}>{weekTitle(weekOffset)}</Text>
            <Text style={s.subtitle}>{weekRange(monday)}</Text>
          </View>
          <View style={s.weekNav}>
            <IconButton icon="chevron-left" label="Poprzedni tydzień" onPress={() => setWeekOffset((w) => w - 1)} />
            <IconButton
              icon="chevron-right"
              label="Następny tydzień"
              disabled={weekOffset >= 0}
              onPress={() => setWeekOffset((w) => Math.min(w + 1, 0))}
            />
          </View>
        </View>

        {days === null ? (
          <View style={s.loader}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <>
            <Animated.View entering={FadeInDown.duration(320)}>
              <Card variant="hero" style={s.chartCard}>
                <View style={s.chartHead}>
                  <Text style={s.cardEyebrow}>Kalorie dziennie</Text>
                  {goalKcal ? <Text style={s.goalNote}>cel {round(goalKcal)} kcal</Text> : null}
                </View>
                <View style={s.chartCols}>
                  {days.map((day, i) => (
                    <Pressable
                      key={day.dateKey}
                      disabled={day.isFuture}
                      accessibilityRole="button"
                      accessibilityLabel={`${DAY_LABELS[i]}, ${round(day.kcal)} kcal. Otwórz w dzienniku`}
                      style={({ pressed }) => [s.col, pressed && s.colPressed]}
                      onPress={() => openDay(day.date)}
                    >
                      <Text style={s.barValue} numberOfLines={1}>
                        {day.kcal > 0 ? round(day.kcal) : ""}
                      </Text>
                      <View style={[s.barTrack, day.isFuture && s.barFuture]}>
                        {day.kcal > 0 ? (
                          <WeeklyBar pct={Math.min(day.kcal / maxVal, 1)} color={barColor(day)} delay={120 + i * 45} />
                        ) : null}
                        {goalPct ? <View style={[s.goalLine, { bottom: goalPct * BAR_H }]} /> : null}
                      </View>
                      <Text style={[s.dayLabel, day.isToday && s.dayToday]}>{DAY_LABELS[i]}</Text>
                    </Pressable>
                  ))}
                </View>
                {goalKcal ? (
                  <View style={s.legend}>
                    <View style={s.legendItem}>
                      <View style={s.legendLine} />
                      <Text style={s.legendText}>cel</Text>
                    </View>
                    <LegendDot color={colors.green} label="w celu" />
                    <LegendDot color={colors.mutedMid} label="poniżej" />
                    <LegendDot color={colors.danger} label="ponad" />
                    {minKcal ? <LegendDot color={colors.borderMid} label="nieliczony" /> : null}
                  </View>
                ) : null}
              </Card>
            </Animated.View>

            {loggedDays.length === 0 ? (
              <Card variant="flat" style={s.emptyCard}>
                <Icon name="bar-chart" size={28} color={colors.mutedMid} />
                <Text style={s.emptyTitle}>Brak wpisów w tym tygodniu</Text>
                <Text style={s.emptyText}>
                  {weekOffset === 0
                    ? "Statystyki pojawią się po pierwszym dodanym posiłku."
                    : "W tym tygodniu nie było żadnych posiłków."}
                </Text>
                {weekOffset === 0 ? (
                  <Button title="Otwórz dziennik" variant="secondary" icon="utensils" onPress={() => router.navigate("/home")} />
                ) : null}
              </Card>
            ) : (
              <>
                {goalKcal && completedDays.length > 0 ? (
                  <Animated.View entering={FadeInDown.delay(60).duration(320)}>
                    <Card style={s.card}>
                      <Text style={s.cardEyebrow}>Średnia dzienna</Text>
                      <View style={s.avgRow}>
                        <Text style={s.avgNum}>{round(avgKcal)}</Text>
                        <Text style={s.avgUnit}>kcal z {round(goalKcal)}</Text>
                      </View>
                      <AnimatedBar
                        pct={Math.min((avgKcal / goalKcal) * 100, 100)}
                        color={avgKcal > goalKcal * 1.1 ? colors.danger : colors.accent}
                        height={6}
                        delay={160}
                        track={colors.surfaceAlt}
                      />
                      <Text style={s.cardNote}>
                        Z {completedDays.length} {completedDays.length === 1 ? "zakończonego dnia" : "zakończonych dni"}
                        {weekOffset === 0 ? ", bez dzisiaj" : ""}
                        {skippedDays.length > 0 ? ` · ${skippedDays.length} ${dayWord(skippedDays.length)} poza średnią` : ""}
                      </Text>
                    </Card>
                  </Animated.View>
                ) : completedDays.length === 0 ? (
                  <Text style={s.hint}>Średnia pojawi się po pierwszym zakończonym dniu.</Text>
                ) : null}

                {(goalProtein || goalCarbs || goalFat) && completedDays.length > 0 ? (
                  <Animated.View entering={FadeInDown.delay(100).duration(320)}>
                    <Card style={s.card}>
                      <Text style={s.cardEyebrow}>Makra średnio dziennie</Text>
                      <View style={s.macroStack}>
                        {goalProtein ? <MacroRow label="Białko" avg={avgProtein} goal={goalProtein} color={colors.protein} delay={200} /> : null}
                        {goalCarbs ? <MacroRow label="Węglowodany" avg={avgCarbs} goal={goalCarbs} color={colors.carbs} delay={240} /> : null}
                        {goalFat ? <MacroRow label="Tłuszcze" avg={avgFat} goal={goalFat} color={colors.fat} delay={280} /> : null}
                      </View>
                    </Card>
                  </Animated.View>
                ) : null}

                {insights.length > 0 ? (
                  <Animated.View entering={FadeInDown.delay(140).duration(320)}>
                    <Card style={s.card}>
                      <Text style={s.cardEyebrow}>Do poprawy</Text>
                      <View style={s.insightList}>
                        {insights.map((item) => (
                          <View key={item.macro} style={[s.insightRow, { backgroundColor: `${item.color}14` }]}>
                            <Text style={[s.insightPct, { color: item.color }]}>{item.pct}%</Text>
                            <Text style={s.insightText}>
                              celu {item.macro} średnio przez {completedDays.length} {dayWord(completedDays.length)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </Card>
                  </Animated.View>
                ) : null}

                <Animated.View entering={FadeInDown.delay(180).duration(320)} style={s.pillsRow}>
                  {goalKcal ? (
                    <Card style={s.pill}>
                      <Text style={s.pillVal}>{metDays.length}/{countedDays.length}</Text>
                      <Text style={s.pillLabel}>dni w celu</Text>
                    </Card>
                  ) : null}
                  <Card style={s.pill}>
                    <Text style={s.pillVal}>{round(totalKcal)}</Text>
                    <Text style={s.pillLabel}>łącznie kcal</Text>
                  </Card>
                  <Card style={[s.pill, streak > 0 && s.pillFlame]}>
                    <View style={s.pillStreakRow}>
                      <Icon name="flame" size={16} color={streak > 0 ? colors.accent : colors.muted} />
                      <Text style={[s.pillVal, streak > 0 && { color: colors.accent }]}>
                        {streak >= STREAK_WINDOW ? `${STREAK_WINDOW}+` : streak}
                      </Text>
                    </View>
                    <Text style={s.pillLabel}>seria dni</Text>
                  </Card>
                </Animated.View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
};

const s = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingTop: space.xl },
  header: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", paddingBottom: 18 },
  headerText: { flex: 1, gap: 4 },
  eyebrow: { ...typography.stat, color: colors.accent },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.caption, color: colors.mutedMid },
  weekNav: { flexDirection: "row", gap: 6, marginTop: 18 },
  loader: { alignItems: "center", paddingVertical: 60 },

  chartCard: { marginBottom: space.md, padding: space.lg, paddingBottom: space.md },
  chartHead: { alignItems: "baseline", flexDirection: "row", justifyContent: "space-between" },
  goalNote: { ...typography.micro, color: colors.mutedMid },
  chartCols: { flexDirection: "row", gap: 6 },
  col: { alignItems: "center", flex: 1, gap: 6 },
  colPressed: { opacity: 0.6 },
  barValue: { ...typography.micro, color: colors.mutedMid, fontVariant: ["tabular-nums"], height: 14 },
  barTrack: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 6,
    height: BAR_H,
    overflow: "hidden",
    width: "100%",
  },
  barFuture: { opacity: 0.3 },
  barFill: { borderRadius: 6, height: BAR_H, width: "100%" },
  // Drawn per column, so the gaps between bars make it read as a dashed line.
  goalLine: { backgroundColor: colors.accent, height: 2, left: 0, opacity: 0.55, position: "absolute", right: 0 },
  legendLine: { backgroundColor: colors.accent, borderRadius: 1, height: 2, opacity: 0.7, width: 12 },
  dayLabel: { ...typography.micro, color: colors.mutedMid },
  dayToday: { color: colors.accent, fontFamily: typography.label.fontFamily },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 14 },
  legendItem: { alignItems: "center", flexDirection: "row", gap: 5 },
  legendDot: { borderRadius: 4, height: 8, width: 8 },
  legendText: { ...typography.micro, color: colors.mutedMid },

  emptyCard: { alignItems: "center", gap: 10, marginBottom: space.md, padding: space.xl },
  emptyTitle: { ...typography.section, color: colors.text },
  emptyText: { ...typography.caption, color: colors.mutedMid, marginBottom: 6, textAlign: "center" },
  hint: { ...typography.caption, color: colors.mutedMid, marginBottom: space.md, textAlign: "center" },

  card: { marginBottom: space.md, padding: space.lg },
  cardEyebrow: { ...typography.stat, color: colors.mutedMid, marginBottom: 12 },
  cardNote: { ...typography.micro, color: colors.mutedMid, marginTop: 10 },

  avgRow: { alignItems: "flex-end", flexDirection: "row", gap: 8, marginBottom: 12 },
  avgNum: { ...typography.display, color: colors.text, fontSize: 40, lineHeight: 44 },
  avgUnit: { ...typography.label, color: colors.mutedMid, paddingBottom: 6 },

  macroStack: { gap: 14 },
  macroRow: { gap: 6 },
  macroTop: { flexDirection: "row", justifyContent: "space-between" },
  macroLabel: { ...typography.label, color: colors.text },
  macroVal: { ...typography.label, color: colors.text, fontVariant: ["tabular-nums"] },
  macroGoal: { color: colors.mutedMid },
  macroTrackWrap: { alignItems: "center", flexDirection: "row", gap: 8 },
  macroTrackFlex: { flex: 1 },
  macroPct: { ...typography.micro, color: colors.mutedMid, minWidth: 34, textAlign: "right" },

  insightList: { gap: 8 },
  insightRow: { alignItems: "center", borderRadius: radius.control, flexDirection: "row", gap: 12, padding: 12 },
  insightPct: { ...typography.section, fontVariant: ["tabular-nums"], minWidth: 48 },
  insightText: { ...typography.caption, color: colors.text, flex: 1 },

  pillsRow: { flexDirection: "row", gap: space.sm, marginBottom: 4 },
  pill: { alignItems: "center", flex: 1, gap: 3, paddingVertical: 14 },
  pillFlame: { backgroundColor: colors.accentA, borderColor: colors.accentB },
  pillStreakRow: { alignItems: "center", flexDirection: "row", gap: 4 },
  pillVal: { ...typography.section, color: colors.text, fontVariant: ["tabular-nums"] },
  pillLabel: { ...typography.micro, color: colors.mutedMid, textAlign: "center" },
});
