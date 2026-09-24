import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "../../components/Card";
import { addDays, daysFromToday, formatDayLabel, startOfDay, startOfWeek, toDateKey } from "../../core/date";
import { goalStatus, isDayCounted, round } from "../../core/macroCalculator";
import { getDayTotals, type DayTotals } from "../../data/mealRepository";
import { useAuth } from "../../providers/AuthProvider";
import { useMeals } from "../../providers/MealsProvider";
import { useUserProfile } from "../../providers/UserProfileProvider";
import { colors } from "../../theme/colors";
import { radius, space } from "../../theme/layout";
import { typography } from "../../theme/typography";

const WEEKS = 5;
const WEEKDAYS = ["pn", "wt", "śr", "cz", "pt", "sb", "nd"];

type Cell = DayTotals & { date: Date; isFuture: boolean; isToday: boolean };
type Kind = "future" | "empty" | "skipped" | "under" | "met" | "over" | "logged";

const cellKind = (cell: Cell, goal: number | null, minKcal: number | null): Kind => {
  if (cell.isFuture) return "future";
  if (cell.kcal <= 0) return "empty";
  // Today is still in progress, so it is never marked as skipped.
  if (!cell.isToday && !isDayCounted(cell.kcal, minKcal)) return "skipped";
  return goal ? goalStatus(cell.kcal, goal) : "logged";
};

const KIND_LABEL: Record<Kind, string> = {
  future: "",
  empty: "brak wpisów",
  skipped: "dzień nieliczony",
  under: "poniżej celu",
  met: "w celu",
  over: "ponad cel",
  logged: "zapisany",
};

// Last five weeks, Monday to Sunday, coloured by how each day went. Days under
// the optional kcal floor are dimmed and struck through: they were not fully
// logged, so they stay out of every average.
export const DaysCalendar = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { setDateOffset } = useMeals();
  const [cells, setCells] = useState<Cell[]>([]);
  const [selected, setSelected] = useState<Cell | null>(null);
  const goal = profile?.goalKcal ?? null;
  const minKcal = profile?.minCountedKcal ?? null;
  // Reload key: the grid moves on when the date changes while it is on screen.
  const todayKey = toDateKey(new Date());

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const today = startOfDay(new Date());
      const first = addDays(startOfWeek(today), -(WEEKS - 1) * 7);
      const dates = Array.from({ length: WEEKS * 7 }, (_, i) => addDays(first, i));
      void getDayTotals(user.uid, dates).then((totals) => {
        if (!active) return;
        setCells(
          totals.map((t, i) => ({
            ...t,
            date: dates[i],
            isFuture: dates[i] > today,
            isToday: t.dateKey === toDateKey(today),
          })),
        );
      });
      return () => { active = false; };
    }, [todayKey, user.uid]),
  );

  const selectedKind = selected ? cellKind(selected, goal, minKcal) : null;
  const skippedCount = cells.filter((c) => cellKind(c, goal, minKcal) === "skipped").length;

  const openInDiary = (cell: Cell) => {
    setDateOffset(daysFromToday(cell.date));
    router.navigate("/home");
  };

  return (
    <Card style={s.card}>
      <View style={s.head}>
        <Text style={s.eyebrow}>Ostatnie {WEEKS} tygodni</Text>
        {minKcal && skippedCount > 0 ? (
          <Text style={s.headNote}>{skippedCount} nieliczonych</Text>
        ) : null}
      </View>

      <View style={s.row}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={s.weekday}>{d}</Text>
        ))}
      </View>

      {Array.from({ length: WEEKS }, (_, w) => (
        <View key={w} style={s.row}>
          {cells.slice(w * 7, w * 7 + 7).map((cell) => {
            const kind = cellKind(cell, goal, minKcal);
            const isSelected = selected?.dateKey === cell.dateKey;
            return (
              <Pressable
                key={cell.dateKey}
                disabled={kind === "future"}
                accessibilityRole="button"
                accessibilityLabel={`${cell.date.getDate()}, ${KIND_LABEL[kind]}${cell.kcal > 0 ? `, ${round(cell.kcal)} kcal` : ""}`}
                style={[s.cell, s[kind], cell.isToday && s.today, isSelected && s.cellSelected]}
                onPress={() => setSelected(isSelected ? null : cell)}
              >
                {kind === "skipped" ? <View style={s.strike} /> : null}
                <Text style={[s.cellText, (kind === "met" || kind === "over") && s.cellTextStrong]}>
                  {cell.date.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}

      {selected && selectedKind ? (
        <View style={s.detail}>
          <Text style={s.detailText}>
            <Text style={s.detailDay}>{formatDayLabel(daysFromToday(selected.date), selected.date)}</Text>
            {"  ·  "}
            {selected.kcal > 0 ? `${round(selected.kcal)} kcal · ` : ""}
            {KIND_LABEL[selectedKind]}
            {selectedKind === "skipped" && minKcal ? ` (poniżej ${round(minKcal)})` : ""}
          </Text>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => openInDiary(selected)}>
            <Text style={s.detailLink}>Otwórz</Text>
          </Pressable>
        </View>
      ) : (
        <View style={s.legend}>
          {goal ? (
            <>
              <Legend style={s.met} label="w celu" />
              <Legend style={s.under} label="poniżej" />
              <Legend style={s.over} label="ponad" />
            </>
          ) : (
            <Legend style={s.logged} label="zapisany" />
          )}
          {minKcal ? <Legend style={s.skipped} label="nieliczony" strike /> : null}
        </View>
      )}
    </Card>
  );
};

function Legend({ style, label, strike = false }: { style: object; label: string; strike?: boolean }) {
  return (
    <View style={s.legendItem}>
      <View style={[s.legendSwatch, style]}>{strike ? <View style={s.strike} /> : null}</View>
      <Text style={s.legendText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { gap: 6, marginBottom: 14, padding: space.lg },
  head: { alignItems: "baseline", flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  eyebrow: { ...typography.stat, color: colors.mutedMid },
  headNote: { ...typography.micro, color: colors.mutedMid },
  row: { flexDirection: "row", gap: 6 },
  weekday: { ...typography.micro, color: colors.muted, flex: 1, textAlign: "center" },

  cell: {
    alignItems: "center",
    aspectRatio: 1,
    borderColor: "transparent",
    borderRadius: 10,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  cellSelected: { borderColor: colors.text },
  today: { borderColor: colors.accent },
  cellText: { ...typography.micro, color: colors.mutedMid, fontVariant: ["tabular-nums"] },
  cellTextStrong: { color: colors.text },

  future: { opacity: 0.25 },
  // Outline only: a fill would match the card and vanish.
  empty: { borderColor: colors.border },
  logged: { backgroundColor: `${colors.accent}40` },
  under: { backgroundColor: `${colors.mutedMid}2E` },
  met: { backgroundColor: `${colors.green}59` },
  over: { backgroundColor: `${colors.danger}59` },
  skipped: { backgroundColor: "transparent", borderColor: colors.borderMid, borderStyle: "dashed" },
  // Diagonal line through a skipped day.
  strike: {
    backgroundColor: colors.muted,
    height: 1.5,
    opacity: 0.7,
    position: "absolute",
    transform: [{ rotate: "-45deg" }],
    width: "140%",
  },

  detail: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.control,
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailText: { ...typography.caption, color: colors.mutedMid, flex: 1 },
  detailDay: { color: colors.text, fontFamily: typography.label.fontFamily },
  detailLink: { ...typography.label, color: colors.accent },

  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  legendItem: { alignItems: "center", flexDirection: "row", gap: 6 },
  legendSwatch: { borderRadius: 4, borderWidth: 1, borderColor: "transparent", height: 12, overflow: "hidden", width: 12, alignItems: "center", justifyContent: "center" },
  legendText: { ...typography.micro, color: colors.mutedMid },
});
