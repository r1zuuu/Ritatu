import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { FAB_CLEARANCE } from "../../components/BottomTabBar";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Icon } from "../../components/Icon";
import { IconButton } from "../../components/IconButton";
import { daysFromToday, formatDayLabel } from "../../core/date";
import { formatDecimal } from "../../core/numberFormat";
import type { GoalType, ProgressPhoto, UserProfile, WeightEntry } from "../../data/types";
import { colors } from "../../theme/colors";
import { radius, space } from "../../theme/layout";
import { typography } from "../../theme/typography";
import { angleLabel } from "./AddProgressPhotoSheet";
import { DaysCalendar } from "./DaysCalendar";
import { WeightChart } from "./WeightChart";

const HISTORY_PREVIEW = 5;

const parseDate = (iso: string) => new Date(`${iso}T00:00`);
const formatDDMM = (date: Date) => `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;
const signed = (kg: number) => `${kg > 0 ? "+" : kg < 0 ? "−" : ""}${formatDecimal(Math.abs(kg), 1)} kg`;

// Whether a change moves toward the goal: a drop is good only when cutting.
const isGoodChange = (delta: number, goal: GoalType | null | undefined) =>
  goal === "gain" ? delta >= 0 : goal === "maintain" ? Math.abs(delta) <= 1 : delta <= 0;

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </Card>
  );
}

type Props = {
  weights: WeightEntry[];
  profile: UserProfile | null | undefined;
  progressPhotos: ProgressPhoto[];
  onAddWeight: () => void;
  onDeleteWeight: (entry: WeightEntry) => void;
  onAddPhoto: () => void;
  onDeletePhoto: (id: string) => void;
};

export const MeasurementsView = ({
  weights,
  profile,
  progressPhotos,
  onAddWeight,
  onDeleteWeight,
  onAddPhoto,
  onDeletePhoto,
}: Props) => {
  const [showAllHistory, setShowAllHistory] = useState(false);
  const { width } = useWindowDimensions();
  const current = weights.at(-1);
  const start = weights.at(0);
  const delta = current && start ? Number((current.weightKg - start.weightKg).toFixed(1)) : 0;
  const hasTrend = weights.length >= 2;
  const good = isGoodChange(delta, profile?.goalType);
  const target = profile?.targetWeightKg ?? null;
  const toTarget = current && target ? Number((target - current.weightKg).toFixed(1)) : null;

  const history = [...weights].reverse();
  const shownHistory = showAllHistory ? history : history.slice(0, HISTORY_PREVIEW);

  return (
    <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: FAB_CLEARANCE }]} showsVerticalScrollIndicator={false}>
      <Text style={s.eyebrow}>Postępy</Text>
      <Text style={s.title}>Pomiary</Text>

      <Animated.View entering={FadeInDown.duration(320)}>
        <Card variant="hero" style={s.card}>
          {current ? (
            <>
              <View style={s.cardTop}>
                <View>
                  <Text style={s.cardLabel}>Aktualna waga</Text>
                  <View style={s.currentRow}>
                    <Text style={s.currentValue}>{formatDecimal(current.weightKg, 1)}</Text>
                    <Text style={s.currentUnit}>kg</Text>
                  </View>
                  {hasTrend ? (
                    <Text style={[s.delta, { color: good ? colors.green : colors.danger }]}>
                      {signed(delta)} od {formatDDMM(parseDate(start!.date))}
                    </Text>
                  ) : (
                    <Text style={s.deltaMuted}>Dodaj kolejny pomiar, żeby zobaczyć zmianę.</Text>
                  )}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Dodaj pomiar wagi"
                  style={({ pressed }) => [s.addButton, pressed && s.pressed]}
                  onPress={onAddWeight}
                >
                  <Icon name="plus" size={16} color={colors.warmBlack} />
                  <Text style={s.addButtonText}>Pomiar</Text>
                </Pressable>
              </View>
              {hasTrend ? <WeightChart data={weights} target={target} width={width - space.xl * 2 - space.lg * 2} /> : null}
            </>
          ) : (
            <View style={s.emptyWeight}>
              <View style={s.emptyIcon}>
                <Icon name="weight" size={26} color={colors.accent} />
              </View>
              <Text style={s.emptyTitle}>Zacznij śledzić wagę</Text>
              <Text style={s.emptyText}>
                Waż się rano, po wstaniu, najlepiej kilka razy w tygodniu. Wykres pokaże kierunek, a nie dzienne wahania.
              </Text>
              <Button title="Dodaj pierwszy pomiar" icon="plus" onPress={onAddWeight} />
            </View>
          )}
        </Card>
      </Animated.View>

      {current ? (
        <Animated.View entering={FadeInDown.delay(60).duration(320)} style={s.stats}>
          <StatCard label="Cel" value={target ? `${formatDecimal(target, 1)} kg` : "brak"} color={colors.text} />
          <StatCard
            label="Do celu"
            value={toTarget === null ? "–" : toTarget === 0 ? "osiągnięty" : signed(toTarget)}
            color={toTarget === 0 ? colors.green : colors.text}
          />
          <StatCard label="Pomiarów" value={String(weights.length)} color={colors.text} />
        </Animated.View>
      ) : null}

      <Text style={s.sectionTitle}>Dni</Text>
      <Text style={s.sectionHint}>Jak szły ostatnie tygodnie. Dotknij dnia, żeby zobaczyć kcal.</Text>
      <Animated.View entering={FadeInDown.delay(100).duration(320)}>
        <DaysCalendar />
      </Animated.View>

      {history.length > 0 ? (
        <>
          <Text style={s.sectionTitle}>Historia pomiarów</Text>
          <Card style={s.historyCard}>
            {shownHistory.map((entry, index) => {
              const previous = history[index + 1];
              const diff = previous ? Number((entry.weightKg - previous.weightKg).toFixed(1)) : null;
              const date = parseDate(entry.date);
              return (
                <View key={entry.id} style={[s.historyRow, index > 0 && s.historyBorder]}>
                  <Text style={s.historyDate}>{formatDayLabel(daysFromToday(date), date)}</Text>
                  <Text style={s.historyWeight}>{formatDecimal(entry.weightKg, 1)} kg</Text>
                  <Text style={[s.historyDiff, diff !== null && diff !== 0 && { color: isGoodChange(diff, profile?.goalType) ? colors.green : colors.danger }]}>
                    {diff === null ? "" : signed(diff)}
                  </Text>
                  <IconButton icon="trash" label={`Usuń pomiar ${formatDecimal(entry.weightKg, 1)} kg`} onPress={() => onDeleteWeight(entry)} />
                </View>
              );
            })}
            {history.length > HISTORY_PREVIEW ? (
              <Pressable accessibilityRole="button" style={s.historyMore} onPress={() => setShowAllHistory((v) => !v)}>
                <Text style={s.historyMoreText}>{showAllHistory ? "Pokaż mniej" : `Pokaż wszystkie (${history.length})`}</Text>
              </Pressable>
            ) : null}
          </Card>
        </>
      ) : null}

      <View style={s.photoHeader}>
        <Text style={s.sectionTitleInline}>Zdjęcia postępu</Text>
        {progressPhotos.length > 0 ? (
          <Pressable accessibilityRole="button" style={({ pressed }) => [s.photoAdd, pressed && s.pressed]} onPress={onAddPhoto}>
            <Icon name="camera" size={16} color={colors.accent} />
            <Text style={s.photoAddText}>Dodaj</Text>
          </Pressable>
        ) : null}
      </View>

      {progressPhotos.length > 0 ? (
        <View style={s.photoGrid}>
          {progressPhotos.map((photo) => (
            <Card key={photo.id} style={s.photoCard}>
              <Image source={{ uri: photo.uri }} style={s.photoImage} />
              <View style={s.photoMeta}>
                <View style={s.photoMetaText}>
                  <Text style={s.photoAngle}>{angleLabel(photo.angle)}</Text>
                  <Text style={s.photoDate}>
                    {formatDDMM(photo.createdAt)}
                    {photo.weightKg ? ` · ${formatDecimal(photo.weightKg, 1)} kg` : ""}
                  </Text>
                </View>
                <IconButton icon="trash" label={`Usuń zdjęcie: ${angleLabel(photo.angle)}`} onPress={() => onDeletePhoto(photo.id)} />
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <Pressable accessibilityRole="button" style={({ pressed }) => [s.emptyPhotos, pressed && s.pressed]} onPress={onAddPhoto}>
          <View style={s.emptyIcon}>
            <Icon name="image" size={26} color={colors.accent} />
          </View>
          <Text style={s.emptyTitle}>Dodaj pierwsze zdjęcie</Text>
          <Text style={s.emptyText}>Zdjęcia co 2–4 tygodnie pokazują zmiany, których nie widać na wadze.</Text>
        </Pressable>
      )}
    </ScrollView>
  );
};

const s = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingTop: space.xl },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  eyebrow: { ...typography.stat, color: colors.accent },
  title: { ...typography.title, color: colors.text, marginBottom: 18, marginTop: 4 },

  card: { marginBottom: space.md, padding: space.lg },
  cardTop: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  cardLabel: { ...typography.label, color: colors.mutedMid },
  currentRow: { alignItems: "baseline", flexDirection: "row", gap: 6, marginTop: 3 },
  currentValue: { ...typography.display, color: colors.text },
  currentUnit: { ...typography.section, color: colors.mutedMid },
  delta: { ...typography.label, marginTop: 5 },
  deltaMuted: { ...typography.caption, color: colors.mutedMid, marginTop: 5, maxWidth: 200 },
  addButton: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.pill, flexDirection: "row", gap: 6, height: 40, paddingHorizontal: 16 },
  addButtonText: { ...typography.label, color: colors.warmBlack, fontSize: 14 },

  emptyWeight: { alignItems: "center", gap: 10, paddingVertical: 8 },
  emptyIcon: { alignItems: "center", backgroundColor: colors.accentA, borderRadius: 26, height: 52, justifyContent: "center", width: 52 },
  emptyTitle: { ...typography.section, color: colors.text },
  emptyText: { ...typography.caption, color: colors.mutedMid, marginBottom: 6, textAlign: "center" },

  stats: { flexDirection: "row", gap: space.sm, marginBottom: space.lg },
  stat: { borderRadius: radius.md, flex: 1, gap: 4, padding: 14 },
  statLabel: { ...typography.micro, color: colors.mutedMid },
  statValue: { ...typography.section, fontSize: 17, fontVariant: ["tabular-nums"] },

  sectionTitle: { ...typography.section, color: colors.text, marginTop: space.sm },
  sectionTitleInline: { ...typography.section, color: colors.text },
  sectionHint: { ...typography.caption, color: colors.mutedMid, marginBottom: 10, marginTop: 2 },

  historyCard: { marginBottom: space.lg, marginTop: 10, overflow: "hidden" },
  historyRow: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 52, paddingLeft: 16, paddingRight: 8 },
  historyBorder: { borderTopColor: colors.border, borderTopWidth: 1 },
  historyDate: { ...typography.caption, color: colors.mutedMid, flex: 1 },
  historyWeight: { ...typography.label, color: colors.text, fontSize: 15, fontVariant: ["tabular-nums"] },
  historyDiff: { ...typography.micro, color: colors.mutedMid, fontVariant: ["tabular-nums"], minWidth: 58, textAlign: "right" },
  historyMore: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, justifyContent: "center", minHeight: 46 },
  historyMoreText: { ...typography.label, color: colors.accent },

  photoHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10, marginTop: space.sm },
  photoAdd: { alignItems: "center", flexDirection: "row", gap: 6, minHeight: 44 },
  photoAddText: { ...typography.label, color: colors.accent },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  photoCard: { borderRadius: radius.md, overflow: "hidden", width: "47.5%" },
  photoImage: { aspectRatio: 3 / 4, backgroundColor: colors.surface, width: "100%" },
  photoMeta: { alignItems: "center", flexDirection: "row", paddingLeft: 12, paddingRight: 4, paddingVertical: 4 },
  photoMetaText: { flex: 1 },
  photoAngle: { ...typography.label, color: colors.text },
  photoDate: { ...typography.micro, color: colors.mutedMid, marginTop: 2 },
  emptyPhotos: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 8,
    padding: 24,
  },
});
