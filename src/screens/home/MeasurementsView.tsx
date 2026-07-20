import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useWindowDimensions } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_BAR_HEIGHT = 68;
import { Card } from "../../components/Card";
import { IconButton } from "../../components/IconButton";
import { Icon } from "../../components/Icon";
import type { ProgressPhoto, UserProfile, WeightEntry } from "../../data/types";
import { colors } from "../../theme/colors";
import { radius, space } from "../../theme/layout";
import { typography } from "../../theme/typography";
import { sh } from "../../theme/sharedStyles";
import { angleLabel } from "./AddProgressPhotoSheet";

function formatDDMM(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, { color }]}>{value}</Text>
    </Card>
  );
}

function TrendSegment({ from, to }: { from: { x: number; y: number }; to: { x: number; y: number } }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = `${Math.atan2(dy, dx)}rad`;
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  return (
    <View
      style={[
        trend.segment,
        { left: midX - length / 2, top: midY - 1.5, transform: [{ rotate: angle }], width: length },
      ]}
    />
  );
}

function WeightTrendChart({ data }: { data: WeightEntry[] }) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(360, width - 60);
  const chartHeight = 150;
  const pad = { top: 18, right: 18, bottom: 28, left: 34 };

  if (data.length === 0) {
    return (
      <View style={trend.empty}>
        <Icon name="bar-chart" size={28} color={colors.mutedMid} />
        <Text style={trend.emptyText}>Brak danych do wykresu</Text>
      </View>
    );
  }

  const values = data.map((item) => item.weightKg);
  const min = Math.min(...values) - 0.5;
  const max = Math.max(...values) + 0.5;
  const range = max - min || 1;
  const innerW = chartWidth - pad.left - pad.right;
  const innerH = chartHeight - pad.top - pad.bottom;
  const x = (index: number) => pad.left + (data.length === 1 ? innerW / 2 : (index / (data.length - 1)) * innerW);
  const y = (value: number) => pad.top + innerH - ((value - min) / range) * innerH;
  const points = data.map((item, index) => ({ x: x(index), y: y(item.weightKg), item }));
  const labels = points.filter((_, index) => index === 0 || index === points.length - 1 || index % 2 === 0);

  return (
    <View style={[trend.wrap, { height: chartHeight, width: chartWidth }]}>
      {[0.25, 0.5, 0.75].map((factor) => (
        <View key={factor} style={[trend.gridLine, { left: pad.left, top: pad.top + innerH * factor, width: innerW }]} />
      ))}
      {points.slice(0, -1).map((point, index) => (
        <TrendSegment key={`${point.item.id}-seg`} from={point} to={points[index + 1]} />
      ))}
      {points.map((point, index) => (
        <View
          key={point.item.id}
          style={[
            trend.dot,
            index === points.length - 1 && trend.dotLast,
            { left: point.x - (index === points.length - 1 ? 6 : 4), top: point.y - (index === points.length - 1 ? 6 : 4) },
          ]}
        />
      ))}
      {labels.map((point) => (
        <Text
          key={`${point.item.id}-lbl`}
          numberOfLines={1}
          style={[trend.axisLabel, { left: Math.max(0, Math.min(chartWidth - 58, point.x - 29)), top: chartHeight - 18 }]}
        >
          {point.item.date}
        </Text>
      ))}
    </View>
  );
}

type Props = {
  weights: WeightEntry[];
  profile: UserProfile | null | undefined;
  progressPhotos: ProgressPhoto[];
  onAddWeight: () => void;
  onAddPhoto: () => void;
  onDeletePhoto: (id: string) => Promise<void>;
};

export const MeasurementsView = ({ weights, profile, progressPhotos, onAddWeight, onAddPhoto, onDeletePhoto }: Props) => {
  const insets = useSafeAreaInsets();
  const current = weights.at(-1);
  const start = weights.at(0);
  const delta = current && start ? Number((current.weightKg - start.weightKg).toFixed(1)) : 0;

  return (
    <ScrollView
      contentContainerStyle={[s.scroll, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.header}>
        <Text style={s.title}>Pomiary</Text>
        <IconButton icon="plus" label="Dodaj pomiar" tone="accent" onPress={onAddWeight} />
      </View>

      <Animated.View entering={FadeInDown.duration(420)}>
      <Card variant="hero" style={s.card}>
        <View style={s.cardTop}>
          <View>
            <Text style={s.cardLabel}>Aktualna waga</Text>
            <View style={s.currentRow}>
              <Text style={s.currentValue}>{current ? current.weightKg.toFixed(1) : "-"}</Text>
              <Text style={s.currentUnit}>kg</Text>
            </View>
            {current && start ? (
              <Text style={[s.delta, { color: delta <= 0 ? colors.green : colors.danger }]}>
                {delta <= 0 ? "Spadek" : "Wzrost"} {Math.abs(delta)} kg od początku
              </Text>
            ) : (
              <Text style={s.deltaMuted}>Brak pomiarów</Text>
            )}
          </View>
          <Pressable style={({ pressed }) => [s.addButton, pressed && sh.pressed]} onPress={onAddWeight}>
            <Icon name="plus" size={16} color={colors.warmBlack} />
            <Text style={s.addButtonText}>Dodaj</Text>
          </Pressable>
        </View>
        <WeightTrendChart data={weights} />
      </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(90).duration(420)} style={s.stats}>
        <StatCard label="Cel" value={profile?.targetWeightKg ? `${profile.targetWeightKg} kg` : "Brak"} color={colors.accent} />
        <StatCard label="Różnica" value={current && start ? `${delta} kg` : "-"} color={delta <= 0 ? colors.green : colors.danger} />
        <StatCard label="Pomiarów" value={String(weights.length)} color={colors.fat} />
      </Animated.View>

      <View style={s.photoHeader}>
        <Text style={s.photoTitle}>Zdjęcia postępu</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dodaj zdjęcie postępu"
          style={({ pressed }) => [s.photoAdd, pressed && sh.pressed]}
          onPress={onAddPhoto}
        >
          <Icon name="camera" size={16} color={colors.accent} />
          <Text style={s.photoAddText}>Dodaj</Text>
        </Pressable>
      </View>

      {progressPhotos.length > 0 ? (
        <View style={s.photoGrid}>
          {progressPhotos.map((photo) => (
            <Card key={photo.id} style={s.photoCard}>
              <Image source={{ uri: photo.uri }} style={s.photoImage} />
              <View style={s.photoMeta}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={s.photoAngle}>{angleLabel(photo.angle)}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Usuń zdjęcie ${angleLabel(photo.angle)}`}
                    style={({ pressed }) => [s.photoDelete, pressed && sh.pressed]}
                    onPress={() => void onDeletePhoto(photo.id)}
                  >
                    <Icon name="x" size={13} color={colors.muted} />
                  </Pressable>
                </View>
                <Text style={s.photoDate}>{formatDDMM(photo.createdAt)}</Text>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <Pressable style={({ pressed }) => [s.emptyPhotos, pressed && sh.pressed]} onPress={onAddPhoto}>
          <View style={s.emptyPhotoIcon}>
            <Icon name="image" size={26} color={colors.accent} />
          </View>
          <Text style={s.emptyPhotoTitle}>Dodaj pierwsze zdjęcie</Text>
        </Pressable>
      )}
    </ScrollView>
  );
};

const s = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingTop: 10 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  title: { ...typography.title, color: colors.text },
  card: { marginBottom: space.md, padding: space.lg },
  cardTop: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  cardLabel: { ...typography.label, color: colors.muted },
  currentRow: { alignItems: "baseline", flexDirection: "row", gap: 6, marginTop: 3 },
  currentValue: { ...typography.display, color: colors.text },
  currentUnit: { ...typography.body, color: colors.muted },
  delta: { ...typography.label, marginTop: 5 },
  deltaMuted: { ...typography.label, color: colors.muted, marginTop: 5 },
  addButton: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.pill, flexDirection: "row", gap: 6, height: 38, paddingHorizontal: 15 },
  addButtonText: { ...typography.label, color: colors.warmBlack },
  stats: { flexDirection: "row", gap: space.md, marginBottom: 14 },
  stat: { borderRadius: radius.md, flex: 1, padding: 14 },
  statLabel: { ...typography.label, color: colors.muted, fontSize: 10 },
  statValue: { ...typography.section, marginTop: 4 },
  photoHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  photoTitle: { ...typography.section, color: colors.text },
  photoAdd: { alignItems: "center", flexDirection: "row", gap: 6, minHeight: 40 },
  photoAddText: { ...typography.label, color: colors.accent },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  photoCard: { borderRadius: radius.md, overflow: "hidden", width: "48%" },
  photoImage: { aspectRatio: 3 / 4, backgroundColor: colors.surface, width: "100%" },
  photoMeta: { padding: 10 },
  photoAngle: { ...typography.label, color: colors.text },
  photoDate: { ...typography.label, color: colors.muted, fontSize: 10, marginTop: 2 },
  photoDelete: { alignItems: "center", height: 24, justifyContent: "center", width: 24 },
  emptyPhotos: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: 10, padding: 26 },
  emptyPhotoIcon: { alignItems: "center", backgroundColor: colors.accentA, borderRadius: radius.pill, height: 52, justifyContent: "center", width: 52 },
  emptyPhotoTitle: { ...typography.section, color: colors.text },
  emptyPhotoText: { ...typography.body, color: colors.muted, textAlign: "center" },
});

const trend = StyleSheet.create({
  wrap: { alignSelf: "center", overflow: "hidden", position: "relative" },
  empty: { alignItems: "center", gap: 8, height: 150, justifyContent: "center" },
  emptyText: { ...typography.label, color: colors.muted },
  gridLine: { backgroundColor: colors.border, height: 1, opacity: 0.85, position: "absolute" },
  segment: { backgroundColor: colors.accent, borderRadius: 999, height: 3, opacity: 0.92, position: "absolute" },
  dot: { backgroundColor: colors.card, borderColor: colors.accent, borderRadius: 999, borderWidth: 2, height: 8, position: "absolute", width: 8 },
  dotLast: { backgroundColor: colors.accent, height: 12, width: 12 },
  axisLabel: { ...typography.label, color: colors.muted, fontSize: 10, position: "absolute", textAlign: "center", width: 58 },
});
