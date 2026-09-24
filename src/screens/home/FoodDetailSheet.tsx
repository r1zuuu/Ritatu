import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { IconButton } from "../../components/IconButton";
import { Sheet } from "../../components/Sheet";
import { formatDecimal, parseDecimal } from "../../core/numberFormat";
import { isSection, SECTION_GENITIVE } from "../../core/section";
import { colors } from "../../theme/colors";
import { radius, space } from "../../theme/layout";
import { fontFamilies, typography } from "../../theme/typography";
import type { FoodItem } from "./types";

function MacroTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={s.macroTile}>
      <View style={[s.macroLine, { backgroundColor: color }]} />
      <Text style={s.macroValue}>{value} g</Text>
      <Text style={s.macroLabel}>{label}</Text>
    </View>
  );
}

// One tap for the amounts people log most.
const GRAM_PRESETS = [50, 100, 150, 200];
const PORTION_PRESETS = [0.5, 1, 2];

type Props = {
  visible: boolean;
  food: FoodItem | null;
  section: string;
  lastAmounts: Map<string | number, string>;
  onClose: () => void;
  onAdd: (food: FoodItem, amount: number) => Promise<void>;
};

export const FoodDetailSheet = ({ visible, food, section, lastAmounts, onClose, onAdd }: Props) => {
  const [amountInput, setAmountInput] = useState("100");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!food) return;
    const saved = lastAmounts.get(food.id);
    setAmountInput(saved ?? (food.per100 ? "100" : "1"));
    setSaving(false);
  }, [food]);

  if (!food) return null;

  const parsedAmount = parseDecimal(amountInput);
  const hasValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const amount = hasValidAmount ? parsedAmount : 0;
  const multiplier = food.per100 ? amount / 100 : amount;
  const kcal = Math.round(food.calories * multiplier);
  const protein = Math.round(food.protein * multiplier * 10) / 10;
  const carbs = Math.round(food.carbs * multiplier * 10) / 10;
  const fat = Math.round(food.fat * multiplier * 10) / 10;
  const step = food.per100 ? 10 : 0.5;
  const minAmount = food.per100 ? 1 : 0.5;
  const portionW = food.portionWeightG ?? 100;
  const displayWeightG = food.per100 ? amount : Math.round(amount * portionW);
  const where = isSection(section) ? SECTION_GENITIVE[section] : section.toLowerCase();

  const updateAmount = (val: string) => {
    setAmountInput(val);
    lastAmounts.set(food.id, val);
  };

  const changeAmount = (delta: number) => {
    const base = hasValidAmount ? parsedAmount : 1;
    updateAmount(formatDecimal(Math.max(minAmount, base + delta), food.per100 ? 0 : 1));
  };

  // Guards the double tap that used to add the meal twice.
  const add = async () => {
    if (saving || !hasValidAmount) return;
    setSaving(true);
    try {
      await onAdd(food, amount);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={`Dodaj do ${where}`} height="fit">
      <ScrollView
        contentContainerStyle={s.wrap}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          {food.imageUrl ? (
            <Image source={{ uri: food.imageUrl }} style={s.image} />
          ) : (
            <View style={s.headerIcon}>
              <Icon name={food.code ? "barcode" : "utensils"} size={24} color={colors.mutedMid} />
            </View>
          )}
          <View style={s.headerText}>
            <Text style={s.name} numberOfLines={3}>{food.name}</Text>
            <Text style={s.sub} numberOfLines={1}>
              {food.calories} kcal {food.per100 ? "/ 100 g" : `/ porcja (${portionW} g)`}
            </Text>
          </View>
        </View>

        <View style={s.kcalBlock}>
          <Text style={s.kcal}>{kcal}</Text>
          <Text style={s.kcalLabel}>kcal{!food.per100 && hasValidAmount ? ` · ${displayWeightG} g` : ""}</Text>
        </View>

        <View style={s.macros}>
          <MacroTile label="Białko" value={protein} color={colors.protein} />
          <MacroTile label="Węglowodany" value={carbs} color={colors.carbs} />
          <MacroTile label="Tłuszcze" value={fat} color={colors.fat} />
        </View>

        <View style={s.amountCard}>
          <Text style={s.amountLabel}>{food.per100 ? "Ilość w gramach" : "Liczba porcji"}</Text>
          <View style={s.amountRow}>
            <IconButton icon="minus" label="Zmniejsz ilość" onPress={() => changeAmount(-step)} />
            <View style={s.amountCenter}>
              <TextInput
                style={s.amountInput}
                value={amountInput}
                onChangeText={updateAmount}
                keyboardType="decimal-pad"
                selectTextOnFocus
                accessibilityLabel={food.per100 ? "Gramatura produktu" : "Liczba porcji"}
              />
              <Text style={s.unit}>{food.per100 ? "g" : "×"}</Text>
            </View>
            <IconButton icon="plus" label="Zwiększ ilość" tone="accent" onPress={() => changeAmount(step)} />
          </View>
          <View style={s.presets}>
            {(food.per100 ? GRAM_PRESETS : PORTION_PRESETS).map((value) => {
              const active = hasValidAmount && parsedAmount === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [s.preset, active && s.presetActive, pressed && s.presetPressed]}
                  onPress={() => updateAmount(formatDecimal(value, 1))}
                >
                  <Text style={[s.presetText, active && s.presetTextActive]}>
                    {food.per100 ? `${value} g` : value === 0.5 ? "½" : `${value}×`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button
          title={saving ? "Dodaję..." : `Dodaj · ${kcal} kcal`}
          icon="plus"
          disabled={!hasValidAmount || saving}
          onPress={() => void add()}
        />
      </ScrollView>
    </Sheet>
  );
};

const s = StyleSheet.create({
  wrap: { gap: space.lg, paddingBottom: space.lg, paddingHorizontal: space.xl },
  header: { alignItems: "center", flexDirection: "row", gap: 14 },
  headerIcon: { alignItems: "center", backgroundColor: colors.surfaceAlt, borderRadius: radius.md, height: 56, justifyContent: "center", width: 56 },
  image: { backgroundColor: colors.card, borderRadius: radius.md, height: 56, width: 56 },
  headerText: { flex: 1, gap: 3 },
  name: { ...typography.section, color: colors.text },
  sub: { ...typography.caption, color: colors.mutedMid },
  kcalBlock: { alignItems: "center" },
  kcal: { ...typography.display, color: colors.accent },
  kcalLabel: { ...typography.label, color: colors.mutedMid },
  macros: { flexDirection: "row", gap: 8 },
  macroTile: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    flex: 1,
    gap: 5,
    padding: 10,
  },
  macroLine: { borderRadius: 2, height: 3, width: 24 },
  macroValue: { ...typography.label, color: colors.text, fontSize: 15, fontVariant: ["tabular-nums"] },
  macroLabel: { ...typography.micro, color: colors.mutedMid },
  amountCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: 12, padding: space.lg },
  amountLabel: { ...typography.label, color: colors.mutedMid },
  amountRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  amountCenter: { alignItems: "baseline", flex: 1, flexDirection: "row", gap: 6, justifyContent: "center" },
  amountInput: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: 34,
    fontVariant: ["tabular-nums"],
    paddingVertical: 0,
    textAlign: "center",
    width: 110,
  },
  unit: { ...typography.section, color: colors.mutedMid },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  preset: {
    alignItems: "center",
    borderColor: colors.borderMid,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    minWidth: 60,
    paddingHorizontal: 10,
  },
  presetActive: { backgroundColor: colors.accentA, borderColor: colors.accent },
  presetPressed: { opacity: 0.6 },
  presetText: { ...typography.label, color: colors.mutedMid },
  presetTextActive: { color: colors.accent },
});
