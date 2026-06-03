import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Sheet } from "../../components/Sheet";
import { IconButton } from "../../components/IconButton";
import { Icon } from "../../components/Icon";
import { parseDecimal, formatDecimal } from "../../core/numberFormat";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { sh } from "../../theme/sharedStyles";
import type { FoodItem } from "./types";

function MacroTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={s.macroTile}>
      <View style={[s.macroLine, { backgroundColor: color }]} />
      <Text style={s.macroValue}>{value}g</Text>
      <Text style={s.macroLabel}>{label}</Text>
    </View>
  );
}

type Props = {
  visible: boolean;
  food: FoodItem | null;
  section: string;
  lastAmounts: Map<string | number, string>;
  onClose: () => void;
  onAdd: (food: FoodItem, amount: number) => void;
};

export const FoodDetailSheet = ({ visible, food, section, lastAmounts, onClose, onAdd }: Props) => {
  const [amountInput, setAmountInput] = useState("100");

  useEffect(() => {
    if (!food) return;
    const saved = lastAmounts.get(food.id);
    setAmountInput(saved ?? (food.per100 ? "100" : "1"));
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
  const portionW = food.portionWeightG ?? 100;
  const displayWeightG = food.per100 ? amount : Math.round(amount * portionW);

  const updateAmount = (val: string) => {
    setAmountInput(val);
    lastAmounts.set(food.id, val);
  };

  const changeAmount = (delta: number) => {
    const base = hasValidAmount ? parsedAmount : 1;
    updateAmount(formatDecimal(Math.max(1, base + delta), food.per100 ? 0 : 1));
  };

  return (
    <Sheet visible={visible} onClose={onClose} height="72%">
      <View style={s.wrap}>
        <View style={s.header}>
          {food.imageUrl ? (
            <Image source={{ uri: food.imageUrl }} style={s.image} />
          ) : (
            <View style={s.headerIcon}>
              <Icon name={food.code ? "barcode" : "utensils"} size={24} color={colors.accent} />
            </View>
          )}
          <View style={s.headerText}>
            <Text style={s.name} numberOfLines={2}>{food.name}</Text>
            <Text style={s.sub}>Dodajesz do: <Text style={s.accent}>{section}</Text></Text>
          </View>
        </View>

        <View style={s.kcalBlock}>
          <Text style={s.kcal}>{kcal}</Text>
          <Text style={s.kcalLabel}>kcal</Text>
        </View>

        <View style={s.macros}>
          <MacroTile label="Białko" value={protein} color={colors.protein} />
          <MacroTile label="Węgle" value={carbs} color={colors.carbs} />
          <MacroTile label="Tłuszcze" value={fat} color={colors.fat} />
        </View>

        <View style={s.amountCard}>
          <Text style={s.amountLabel}>
            {food.per100 ? "Ilość (gramy)" : `Liczba porcji${hasValidAmount && !food.per100 ? ` · ${displayWeightG} g` : ""}`}
          </Text>
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
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Dodaj do ${section}`}
          disabled={!hasValidAmount}
          style={({ pressed }) => [sh.cta, !hasValidAmount && sh.disabled, pressed && hasValidAmount && sh.pressed]}
          onPress={() => onAdd(food, amount)}
        >
          <Text style={sh.ctaText}>Dodaj do {section}</Text>
        </Pressable>
      </View>
    </Sheet>
  );
};

const s = StyleSheet.create({
  wrap: { paddingBottom: 26, paddingHorizontal: 20 },
  header: { flexDirection: "row", gap: 14, marginBottom: 20 },
  headerIcon: { alignItems: "center", height: 48, justifyContent: "center", width: 48 },
  image: { backgroundColor: colors.card, borderRadius: 16, height: 56, width: 56 },
  headerText: { flex: 1 },
  name: { ...typography.section, color: colors.text },
  sub: { ...typography.label, color: colors.muted, marginTop: 3 },
  accent: { color: colors.accent },
  kcalBlock: { alignItems: "center", marginBottom: 20 },
  kcal: { ...typography.display, color: colors.accent },
  kcalLabel: { ...typography.label, color: colors.muted },
  macros: { flexDirection: "row", gap: 8, marginBottom: 22 },
  macroTile: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flex: 1, gap: 5, padding: 10 },
  macroLine: { borderRadius: 2, height: 3, width: 22 },
  macroValue: { ...typography.label, color: colors.text, fontSize: 14 },
  macroLabel: { ...typography.label, color: colors.muted, fontSize: 10 },
  amountCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginBottom: 20, padding: 14 },
  amountLabel: { ...typography.label, color: colors.mutedMid, marginBottom: 8 },
  amountRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  amountCenter: { alignItems: "center", flex: 1, flexDirection: "row", justifyContent: "center" },
  amountInput: { ...typography.title, color: colors.text, minWidth: 84, paddingVertical: 0, textAlign: "center" },
  unit: { ...typography.label, color: colors.muted, marginLeft: 4 },
});
