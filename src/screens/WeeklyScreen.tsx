import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../components/Screen";
import { Icon } from "../components/Icon";
import { summarizeMeals, round } from "../core/macroCalculator";
import { toDateKey } from "../core/date";
import { getMealsForDay } from "../data/mealRepository";
import { useAuth } from "../providers/AuthProvider";
import { useUserProfile } from "../providers/UserProfileProvider";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

const DAY_LABELS = ["PN", "WT", "ŚR", "CZ", "PT", "SO", "ND"];

type DayData = {
  date: Date;
  dateKey: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  isFuture: boolean;
  isToday: boolean;
};

const getWeekDays = (today: Date): Date[] => {
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
};

const getWeekRange = (days: Date[]) => {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short" }).format(d);
  return `${fmt(days[0])} – ${fmt(days[6])}`;
};

function MacroRow({ label, avg, goal, color }: { label: string; avg: number; goal: number; color: string }) {
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
        <View style={s.macroTrack}>
          <View style={[s.macroFill, { width: `${pct}%`, backgroundColor: over ? colors.danger : color }]} />
        </View>
        <Text style={[s.macroPct, { color: over ? colors.danger : colors.muted }]}>
          {Math.round(pct)}%
        </Text>
      </View>
    </View>
  );
}

export const WeeklyScreen = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const insets = useSafeAreaInsets();
  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  const goalKcal    = profile?.goalKcal ?? null;
  const goalProtein = profile?.goalProteinG ?? null;
  const goalCarbs   = profile?.goalCarbsG ?? null;
  const goalFat     = profile?.goalFatG ?? null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const weekDays = getWeekDays(today);
      const results = await Promise.all(
        weekDays.map(async (date) => {
          const dateKey = toDateKey(date);
          const isFuture = date > today;
          const isToday = dateKey === toDateKey(today);
          if (isFuture) {
            return { date, dateKey, kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, isFuture: true, isToday: false };
          }
          const meals = await getMealsForDay(user.uid, date);
          const totals = summarizeMeals(meals);
          return {
            date, dateKey,
            kcal: Math.round(totals.kcal),
            proteinG: Math.round(totals.proteinG),
            carbsG: Math.round(totals.carbsG),
            fatG: Math.round(totals.fatG),
            isFuture: false, isToday,
          };
        }),
      );
      setDays(results);
      setLoading(false);
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const weekDays    = getWeekDays(today);
  const activeDays  = days.filter((d) => !d.isFuture);
  const loggedDays  = activeDays.filter((d) => d.kcal > 0);
  const goalMetDays = goalKcal ? loggedDays.filter((d) => d.kcal >= goalKcal * 0.9) : [];

  const avgKcal    = loggedDays.length ? loggedDays.reduce((s, d) => s + d.kcal, 0)     / loggedDays.length : 0;
  const avgProtein = loggedDays.length ? loggedDays.reduce((s, d) => s + d.proteinG, 0) / loggedDays.length : 0;
  const avgCarbs   = loggedDays.length ? loggedDays.reduce((s, d) => s + d.carbsG, 0)   / loggedDays.length : 0;
  const avgFat     = loggedDays.length ? loggedDays.reduce((s, d) => s + d.fatG, 0)     / loggedDays.length : 0;
  const totalKcal  = loggedDays.reduce((s, d) => s + d.kcal, 0);

  type Insight = { macro: string; color: string; pct: number };
  const insights: Insight[] = [];
  if (loggedDays.length > 0) {
    if (goalKcal    && avgKcal    / goalKcal    < 0.8) insights.push({ macro: "kalorii",        color: colors.kcal,    pct: Math.round((avgKcal    / goalKcal)    * 100) });
    if (goalProtein && avgProtein / goalProtein < 0.8) insights.push({ macro: "białka",         color: colors.protein, pct: Math.round((avgProtein / goalProtein) * 100) });
    if (goalCarbs   && avgCarbs   / goalCarbs   < 0.8) insights.push({ macro: "węglowodanów",   color: colors.carbs,   pct: Math.round((avgCarbs   / goalCarbs)   * 100) });
    if (goalFat     && avgFat     / goalFat     < 0.8) insights.push({ macro: "tłuszczów",      color: colors.fat,     pct: Math.round((avgFat     / goalFat)     * 100) });
  }
  const activeDayCount = activeDays.length;
  const dniLabel = activeDayCount === 1 ? "dzień" : "dni";

  const streak = (() => {
    let count = 0;
    for (let i = activeDays.length - 1; i >= 0; i--) {
      if (activeDays[i].kcal > 0) count++;
      else break;
    }
    return count;
  })();

  // Bar height relative to max kcal (or goal if higher)
  const maxVal = Math.max(...days.map((d) => d.kcal), goalKcal ?? 0, 1);

  return (
    <Screen noBottomInset padded={false}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 68 + insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.eyebrow}>Statystyki</Text>
          <Text style={s.title}>Ten tydzień</Text>
          {weekDays.length > 0 && (
            <Text style={s.subtitle}>{getWeekRange(weekDays)}</Text>
          )}
        </View>

        {loading ? (
          <View style={s.loader}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <>
            {/* ── Bar chart ──────────────────────────── */}
            <View style={s.chartCard}>
              <View style={s.chartCols}>
                {days.map((day, i) => {
                  const pct = day.kcal > 0 ? Math.min(day.kcal / maxVal, 1) : 0;
                  const met = !day.isFuture && goalKcal !== null && day.kcal >= goalKcal * 0.9;
                  const hasData = !day.isFuture && day.kcal > 0;
                  return (
                    <View key={day.dateKey} style={s.col}>
                      <View style={[s.barTrack, day.isFuture && s.barFuture]}>
                        {hasData && (
                          <View
                            style={[
                              s.barFill,
                              { height: `${Math.max(pct * 100, 4)}%` },
                              day.isToday && s.barToday,
                              met && s.barMet,
                            ]}
                          />
                        )}
                      </View>
                      <Text style={[s.dayLabel, day.isToday && s.dayToday]}>
                        {DAY_LABELS[i]}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {goalKcal ? (
                <Text style={s.chartGoalNote}>cel: {round(goalKcal)} kcal / dzień</Text>
              ) : null}
            </View>

            {/* ── Cel — dots (zawsze 7) ──────────────── */}
            {goalKcal && days.length > 0 ? (
              <View style={s.dotsCard}>
                <Text style={s.dotsCount}>
                  {goalMetDays.length}/{activeDays.length} dni z celem
                </Text>
                <View style={s.dots}>
                  {days.map((d) => {
                    const met = !d.isFuture && goalKcal !== null && d.kcal >= goalKcal * 0.9;
                    const hasAny = !d.isFuture && d.kcal > 0;
                    return (
                      <View
                        key={d.dateKey}
                        style={[
                          s.dot,
                          d.isFuture && s.dotFuture,
                          hasAny && !met && s.dotHas,
                          met && !d.isToday && s.dotMet,
                          d.isToday && !met && s.dotToday,
                          d.isToday && met && s.dotTodayMet,
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
            ) : null}

            {loggedDays.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyText}>Brak danych z tego tygodnia.</Text>
              </View>
            ) : (
              <>
                {/* ── Średnia dzienna ─────────────────── */}
                {goalKcal ? (
                  <View style={s.card}>
                    <Text style={s.cardEyebrow}>Średnia dzienna</Text>
                    <View style={s.avgRow}>
                      <Text style={s.avgNum}>{round(avgKcal)}</Text>
                      <Text style={s.avgUnit}>kcal  </Text>
                      <Text style={s.avgOf}>z {round(goalKcal)}</Text>
                    </View>
                    <View style={s.avgTrack}>
                      <View
                        style={[
                          s.avgFill,
                          {
                            width: `${Math.min((avgKcal / goalKcal) * 100, 100)}%`,
                            backgroundColor: avgKcal > goalKcal * 1.1 ? colors.danger : colors.accent,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ) : null}

                {/* ── Makra ───────────────────────────── */}
                {(goalProtein || goalCarbs || goalFat) ? (
                  <View style={s.card}>
                    <Text style={s.cardEyebrow}>Makra — średnio dziennie</Text>
                    <View style={s.macroStack}>
                      {goalProtein ? <MacroRow label="Białko" avg={avgProtein} goal={goalProtein} color={colors.protein} /> : null}
                      {goalCarbs   ? <MacroRow label="Węglowodany" avg={avgCarbs} goal={goalCarbs} color={colors.carbs} /> : null}
                      {goalFat     ? <MacroRow label="Tłuszcze" avg={avgFat} goal={goalFat} color={colors.fat} /> : null}
                    </View>
                  </View>
                ) : null}

                {/* ── Insights ────────────────────────── */}
                {insights.length > 0 ? (
                  <View style={s.card}>
                    <Text style={s.cardEyebrow}>Co było za niskie</Text>
                    <View style={s.insightList}>
                      {insights.map((item) => (
                        <View key={item.macro} style={s.insightRow}>
                          <View style={[s.insightBar, { backgroundColor: item.color }]} />
                          <Text style={s.insightText}>
                            Przez ostatnie{" "}
                            <Text style={s.insightBold}>{activeDayCount} {dniLabel}</Text>
                            {" "}brakowało Ci {item.macro} — osiągałeś tylko{" "}
                            <Text style={[s.insightBold, { color: item.color }]}>{item.pct}%</Text>
                            {" "}celu
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {/* ── Quick stats ──────────────────────── */}
                <View style={s.pillsRow}>
                  <View style={s.pill}>
                    <Text style={s.pillVal}>{loggedDays.length}/{activeDays.length}</Text>
                    <Text style={s.pillLabel}>dni aktywnych</Text>
                  </View>
                  <View style={s.pill}>
                    <Text style={s.pillVal}>{round(totalKcal)}</Text>
                    <Text style={s.pillLabel}>łącznie kcal</Text>
                  </View>
                  {/* Flame streak pill */}
                  <View style={[s.pill, streak > 0 && s.pillFlame]}>
                    <View style={s.pillStreakRow}>
                      <Icon name="flame" size={16} color={streak > 0 ? colors.accent : colors.muted} />
                      <Text style={[s.pillVal, streak > 0 && { color: colors.accent }]}>
                        {streak > 0 ? streak : "—"}
                      </Text>
                    </View>
                    <Text style={[s.pillLabel, streak > 0 && { color: colors.accent }]}>
                      seria dni
                    </Text>
                  </View>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
};

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  header: { gap: 4, paddingBottom: 18, paddingTop: 4 },
  eyebrow: { ...typography.stat, color: colors.accent },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.stat, color: colors.muted, marginTop: 2 },
  loader: { alignItems: "center", paddingVertical: 60 },
  empty: { alignItems: "center", paddingVertical: 40 },
  emptyText: { ...typography.body, color: colors.muted },

  // Chart
  chartCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
    padding: 16,
    paddingBottom: 12,
  },
  chartCols: { flexDirection: "row", gap: 4, height: 110 },
  col: { alignItems: "center", flex: 1, gap: 7, justifyContent: "flex-end" },
  barTrack: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 5,
    flex: 1,
    justifyContent: "flex-end",
    overflow: "hidden",
    width: "100%",
  },
  barFuture: { opacity: 0.25 },
  barFill: {
    backgroundColor: colors.mutedMid,
    borderRadius: 4,
    width: "100%",
  },
  barToday: { backgroundColor: colors.accent },
  barMet: { backgroundColor: colors.green },
  dayLabel: { ...typography.stat, color: colors.muted, fontSize: 9 },
  dayToday: { color: colors.accent },
  chartGoalNote: { ...typography.stat, color: colors.muted, fontSize: 9, marginTop: 8, textAlign: "right" },

  // Dots
  dotsCard: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dotsCount: { ...typography.stat, color: colors.muted, fontSize: 9 },
  dots: { flexDirection: "row", gap: 7 },
  dot: {
    borderColor: colors.borderMid,
    borderRadius: 7,
    borderWidth: 1.5,
    height: 14,
    width: 14,
  },
  dotFuture: { opacity: 0.18 },
  dotHas: {
    backgroundColor: colors.mutedMid,
    borderColor: colors.mutedMid,
    opacity: 0.5,
  },
  dotMet: { backgroundColor: colors.green, borderColor: colors.green },
  dotToday: { borderColor: colors.accent, borderWidth: 2 },
  dotTodayMet: { backgroundColor: colors.accent, borderColor: colors.accent },

  // Cards
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
    padding: 16,
  },
  cardEyebrow: { ...typography.stat, color: colors.muted, marginBottom: 12 },

  // Avg kcal
  avgRow: { alignItems: "flex-end", flexDirection: "row", marginBottom: 10 },
  avgNum: { color: colors.text, fontFamily: "Inter_700Bold", fontSize: 40, lineHeight: 44 },
  avgUnit: { ...typography.label, color: colors.muted, paddingBottom: 5 },
  avgOf: { ...typography.label, color: colors.muted, paddingBottom: 5 },
  avgTrack: { backgroundColor: colors.surfaceAlt, borderRadius: 3, height: 5, overflow: "hidden" },
  avgFill: { borderRadius: 3, height: "100%" },

  // Macro rows
  macroStack: { gap: 14 },
  macroRow: { gap: 5 },
  macroTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  macroLabel: { ...typography.label, color: colors.text },
  macroVal: { ...typography.label, color: colors.text },
  macroGoal: { color: colors.muted },
  macroTrackWrap: { alignItems: "center", flexDirection: "row", gap: 8 },
  macroTrack: { backgroundColor: colors.surfaceAlt, borderRadius: 3, flex: 1, height: 5, overflow: "hidden" },
  macroFill: { borderRadius: 3, height: "100%" },
  macroPct: { ...typography.stat, fontSize: 9, minWidth: 28, textAlign: "right" },

  // Insights
  insightList: { gap: 12 },
  insightRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  insightBar: { borderRadius: 2, marginTop: 4, width: 3, minHeight: 36 },
  insightText: { ...typography.body, color: colors.mutedMid, flex: 1, lineHeight: 20 },
  insightBold: { color: colors.text, fontFamily: "Inter_600SemiBold" },

  // Pills
  pillsRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  pill: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    paddingVertical: 13,
  },
  pillFlame: {
    borderColor: colors.accentB,
    backgroundColor: colors.accentA,
  },
  pillStreakRow: { alignItems: "center", flexDirection: "row", gap: 4 },
  pillVal: { color: colors.text, fontFamily: "Inter_700Bold", fontSize: 18, lineHeight: 22 },
  pillLabel: { ...typography.stat, color: colors.muted, fontSize: 9, textAlign: "center" },
});
