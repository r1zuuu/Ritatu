import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { calculateKcal, calculateMealMacros, round, totalsToPer100g } from "../core/macroCalculator";
import { parseDecimal } from "../core/numberFormat";
import { SECTIONS, getSectionByTime, isSection, type Section } from "../core/section";
import type { Confidence, MealDraft, VisionItem } from "../data/types";
import { colors } from "../theme/colors";
import { radius, space } from "../theme/layout";
import { fontFamilies, typography } from "../theme/typography";
import { Button } from "./Button";
import { FavoriteButton } from "./FavoriteButton";
import { Icon } from "./Icon";
import { SegmentedControl } from "./SegmentedControl";
import { Sheet } from "./Sheet";

export type RefineInput = { items: VisionItem[]; section: Section };

type MacroConfirmSheetProps = {
  visible: boolean;
  draft: MealDraft | null;
  // Photo mode: an editable ingredient list. Absent = a single weight field.
  items?: VisionItem[];
  warning?: string | null;
  onClose: () => void;
  onConfirm: (draft: MealDraft) => Promise<void>;
  // Gets the list as the user edited it, so a refine never undoes their fixes.
  onRefine?: (userContext: string, current: RefineInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  editingMealId?: string;
  favorite?: boolean;
  // Gets the meal as currently edited (name, grams), not the original draft.
  onToggleFavorite?: (current: MealDraft) => void;
};

const CONFIDENCE: Record<Confidence, { label: string; color: string }> = {
  low: { label: "Pewność AI: niska", color: colors.danger },
  medium: { label: "Pewność AI: średnia", color: colors.carbs },
  high: { label: "Pewność AI: wysoka", color: colors.green },
};

// Per-100 g macros are fixed per ingredient (from the model); only the weight
// changes, so editing grams never skews the macros.
type EditItem = {
  name: string;
  weightText: string;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

const toEditItem = (it: VisionItem): EditItem => {
  const factor = it.weight_g > 0 ? it.weight_g / 100 : 1;
  return {
    name: it.name,
    weightText: String(round(it.weight_g)),
    proteinPer100g: it.protein_g / factor,
    carbsPer100g: it.carbs_g / factor,
    fatPer100g: it.fat_g / factor,
  };
};

const itemTotals = (it: EditItem) => {
  const w = parseDecimal(it.weightText);
  const grams = Number.isFinite(w) && w > 0 ? w : 0;
  const f = grams / 100;
  return { grams, proteinG: it.proteinPer100g * f, carbsG: it.carbsPer100g * f, fatG: it.fatPer100g * f };
};

const toVisionItem = (it: EditItem): VisionItem => {
  const t = itemTotals(it);
  return { name: it.name, weight_g: t.grams, protein_g: t.proteinG, carbs_g: t.carbsG, fat_g: t.fatG };
};

const sectionItems = SECTIONS.map((s) => ({ label: s, value: s }));

export const MacroConfirmSheet = ({
  visible,
  draft,
  items,
  warning,
  onClose,
  onConfirm,
  onRefine,
  onDelete,
  editingMealId,
  favorite = false,
  onToggleFavorite,
}: MacroConfirmSheetProps) => {
  const isEditing = Boolean(editingMealId);
  const itemsMode = items !== undefined;
  const quickMode = !itemsMode && draft?.source === "quick";

  const [name, setName] = useState("");
  const [weight, setWeight] = useState("100");
  const [kcalText, setKcalText] = useState("");
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [section, setSection] = useState<Section>(getSectionByTime());
  const [busy, setBusy] = useState<"save" | "delete" | "refine" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineText, setRefineText] = useState("");

  // Reset whenever a new draft arrives (parents memoize it, so a re-render
  // does not wipe what the user typed).
  useEffect(() => {
    setName(draft?.name ?? "");
    setWeight(String(round(draft?.weightG ?? 100)));
    setKcalText(draft ? String(round(calculateMealMacros(draft, draft.weightG).kcal)) : "");
    setEditItems(items ? items.map(toEditItem) : []);
    setSection(isSection(draft?.section) ? draft.section : getSectionByTime());
    setBusy(null);
    setError(null);
    setRefineOpen(false);
    setRefineText("");
  }, [draft, items]);

  const macros = useMemo(() => {
    if (!draft) return null;
    if (itemsMode) {
      const t = editItems.map(itemTotals).reduce(
        (acc, it) => ({
          proteinG: acc.proteinG + it.proteinG,
          carbsG: acc.carbsG + it.carbsG,
          fatG: acc.fatG + it.fatG,
          weightG: acc.weightG + it.grams,
        }),
        { proteinG: 0, carbsG: 0, fatG: 0, weightG: 0 },
      );
      return { ...t, kcal: calculateKcal(t.proteinG, t.carbsG, t.fatG) };
    }
    if (quickMode) {
      const base = calculateMealMacros(draft, draft.weightG);
      const kcal = parseDecimal(kcalText);
      return { ...base, kcal: Number.isFinite(kcal) ? kcal : 0, weightG: draft.weightG };
    }
    const w = parseDecimal(weight);
    const grams = Number.isFinite(w) ? w : 0;
    return { ...calculateMealMacros(draft, grams), weightG: grams };
  }, [draft, editItems, itemsMode, kcalText, quickMode, weight]);

  if (!draft) return null;

  const numberOk = (text: string) => { const n = parseDecimal(text); return Number.isFinite(n) && n > 0; };
  const canSave =
    !busy &&
    name.trim().length > 0 &&
    (itemsMode ? editItems.length > 0 && (macros?.weightG ?? 0) > 0 : quickMode ? numberOk(kcalText) : numberOk(weight));

  const run = async (kind: "save" | "delete" | "refine", action: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coś poszło nie tak. Spróbuj ponownie.");
    } finally {
      setBusy(null);
    }
  };

  const save = () =>
    run("save", async () => {
      const base = { ...draft, name: name.trim(), section };
      if (itemsMode && macros) {
        await onConfirm({ ...base, ...totalsToPer100g(macros.weightG, macros.proteinG, macros.carbsG, macros.fatG) });
      } else if (quickMode) {
        // Quick entries store their kcal as "per 100 g" of a nominal 100 g portion.
        await onConfirm({ ...base, kcalPer100g: (parseDecimal(kcalText) * 100) / (draft.weightG || 100) });
      } else {
        await onConfirm({ ...base, weightG: parseDecimal(weight) });
      }
    });

  const refine = () =>
    run("refine", async () => {
      if (!onRefine) return;
      await onRefine(refineText.trim(), { items: editItems.map(toVisionItem), section });
    });

  const updateItemWeight = (index: number, text: string) =>
    setEditItems((prev) => prev.map((it, i) => (i === index ? { ...it, weightText: text } : it)));
  const removeItem = (index: number) => setEditItems((prev) => prev.filter((_, i) => i !== index));

  // Share of energy per macro, for the proportion bar.
  const energy = macros ? { p: macros.proteinG * 4, c: macros.carbsG * 4, f: macros.fatG * 9 } : null;
  const energySum = energy ? energy.p + energy.c + energy.f : 0;
  const confidence = !isEditing && draft.confidence ? CONFIDENCE[draft.confidence] : null;

  return (
    <Sheet
      visible={visible}
      onClose={busy ? () => {} : onClose}
      title={isEditing ? "Edytujesz posiłek" : "Potwierdź posiłek"}
      height={itemsMode ? "88%" : "fit"}
    >
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.nameRow}>
          <TextInput
            accessibilityLabel="Nazwa posiłku"
            style={s.nameInput}
            value={name}
            onChangeText={setName}
            editable={!busy}
            multiline
            blurOnSubmit
            returnKeyType="done"
          />
          {onToggleFavorite && !itemsMode ? (
            <FavoriteButton
              active={favorite}
              onPress={() => {
                const grams = parseDecimal(weight);
                const current = { ...draft, name: name.trim() || draft.name, section };
                if (quickMode) {
                  const kcal = parseDecimal(kcalText);
                  onToggleFavorite(Number.isFinite(kcal) ? { ...current, kcalPer100g: (kcal * 100) / (draft.weightG || 100) } : current);
                } else {
                  onToggleFavorite(Number.isFinite(grams) && grams > 0 ? { ...current, weightG: grams } : current);
                }
              }}
            />
          ) : null}
        </View>

        {confidence ? (
          <View style={[s.chip, { backgroundColor: `${confidence.color}1F` }]}>
            <View style={[s.chipDot, { backgroundColor: confidence.color }]} />
            <Text style={[s.chipText, { color: confidence.color }]}>{confidence.label}</Text>
          </View>
        ) : null}
        {draft.note ? <Text style={s.note}>{draft.note}</Text> : null}
        {warning || error ? (
          <View style={s.errorBox}>
            <Icon name="alert" size={16} color={colors.danger} />
            <Text style={s.errorText}>{error ?? warning}</Text>
          </View>
        ) : null}

        {macros ? (
          <View style={s.summary}>
            <View style={s.kcalRow}>
              <Text style={s.kcal}>{round(macros.kcal)}</Text>
              <Text style={s.kcalUnit}>kcal{!quickMode ? ` · ${round(macros.weightG)} g` : ""}</Text>
            </View>
            {energySum > 0 && energy ? (
              <View style={s.ratioBar}>
                <View style={{ backgroundColor: colors.protein, flex: energy.p }} />
                <View style={{ backgroundColor: colors.carbs, flex: energy.c }} />
                <View style={{ backgroundColor: colors.fat, flex: energy.f }} />
              </View>
            ) : null}
            <View style={s.macroRow}>
              <Macro label="Białko" grams={macros.proteinG} color={colors.protein} />
              <Macro label="Węglowodany" grams={macros.carbsG} color={colors.carbs} />
              <Macro label="Tłuszcze" grams={macros.fatG} color={colors.fat} />
            </View>
          </View>
        ) : null}

        {itemsMode ? (
          <View style={s.items}>
            <Text style={s.sectionLabel}>Składniki</Text>
            {editItems.length === 0 ? (
              <Text style={s.empty}>
                AI nie rozpoznało składników. Popraw opis poniżej albo zrób nowe zdjęcie.
              </Text>
            ) : (
              editItems.map((it, index) => {
                const t = itemTotals(it);
                return (
                  <View key={`${it.name}-${index}`} style={s.itemRow}>
                    <View style={s.itemText}>
                      <Text style={s.itemName} numberOfLines={2}>{it.name}</Text>
                      <Text style={s.itemKcal}>{round(calculateKcal(t.proteinG, t.carbsG, t.fatG))} kcal</Text>
                    </View>
                    <View style={s.itemWeight}>
                      <TextInput
                        accessibilityLabel={`Gramatura: ${it.name}`}
                        style={s.itemWeightInput}
                        value={it.weightText}
                        onChangeText={(text) => updateItemWeight(index, text)}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                        editable={!busy}
                      />
                      <Text style={s.unit}>g</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Usuń ${it.name}`}
                      hitSlop={8}
                      disabled={Boolean(busy)}
                      style={({ pressed }) => [s.itemRemove, pressed && s.pressed]}
                      onPress={() => removeItem(index)}
                    >
                      <Icon name="x" size={18} color={colors.mutedMid} />
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <View style={s.amountRow}>
            <Text style={s.amountLabel}>{quickMode ? "Kalorie" : "Gramatura"}</Text>
            <View style={s.amountField}>
              <TextInput
                accessibilityLabel={quickMode ? "Kalorie" : "Gramatura w gramach"}
                style={s.amountInput}
                value={quickMode ? kcalText : weight}
                onChangeText={quickMode ? setKcalText : setWeight}
                keyboardType="decimal-pad"
                selectTextOnFocus
                editable={!busy}
              />
              <Text style={s.unit}>{quickMode ? "kcal" : "g"}</Text>
            </View>
          </View>
        )}

        <Text style={s.sectionLabel}>Posiłek</Text>
        <SegmentedControl items={sectionItems} value={section} onChange={setSection} disabled={Boolean(busy)} />

        {onRefine ? (
          refineOpen ? (
            <View style={s.refineBox}>
              <Text style={s.sectionLabelTight}>Co poprawić?</Text>
              <TextInput
                accessibilityLabel="Co poprawić w analizie"
                style={s.refineInput}
                placeholder="np. to był mały talerz, ryżu ok. 150 g"
                value={refineText}
                onChangeText={setRefineText}
                placeholderTextColor={colors.muted}
                multiline
                editable={busy !== "refine"}
              />
              <View style={s.row}>
                <View style={s.flex}>
                  <Button title="Anuluj" variant="ghost" disabled={busy === "refine"} onPress={() => { setRefineOpen(false); setRefineText(""); }} />
                </View>
                <View style={s.flex}>
                  <Button title="Popraw z AI" icon="sparkles" variant="secondary" disabled={!refineText.trim() || Boolean(busy)} onPress={() => void refine()} />
                </View>
              </View>
              {busy === "refine" ? (
                <View style={s.refineLoading}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={s.refineLoadingText}>AI przelicza posiłek...</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [s.refineHint, pressed && s.pressed]}
              onPress={() => setRefineOpen(true)}
              disabled={Boolean(busy)}
            >
              <Icon name="sparkles" size={16} color={colors.accent} />
              <Text style={s.refineHintText}>Wynik nieprecyzyjny? Popraw z AI</Text>
            </Pressable>
          )
        ) : null}

        {isEditing && onDelete ? (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [s.deleteRow, pressed && s.pressed]}
            disabled={Boolean(busy)}
            onPress={() => void run("delete", onDelete)}
          >
            <Icon name="trash" size={18} color={colors.danger} />
            <Text style={s.deleteText}>{busy === "delete" ? "Usuwam..." : "Usuń posiłek"}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={s.footer}>
        <View style={s.flex}>
          <Button title="Anuluj" variant="secondary" onPress={onClose} disabled={Boolean(busy)} />
        </View>
        <View style={s.flex}>
          <Button title={busy === "save" ? "Zapisuję..." : "Zapisz"} icon="check" disabled={!canSave} onPress={() => void save()} />
        </View>
      </View>
    </Sheet>
  );
};

function Macro({ label, grams, color }: { label: string; grams: number; color: string }) {
  return (
    <View style={s.macro}>
      <View style={s.macroHead}>
        <View style={[s.macroDot, { backgroundColor: color }]} />
        <Text style={s.macroLabel}>{label}</Text>
      </View>
      <Text style={s.macroValue}>{round(grams)} g</Text>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { flexShrink: 1 },
  content: { gap: space.md, paddingBottom: space.lg, paddingHorizontal: space.xl },
  flex: { flex: 1 },
  row: { flexDirection: "row", gap: 10 },
  pressed: { opacity: 0.6 },

  nameRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  nameInput: { ...typography.headline, color: colors.text, flex: 1, padding: 0 },
  chip: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipDot: { borderRadius: 3, height: 6, width: 6 },
  chipText: { ...typography.micro },
  note: { ...typography.caption, color: colors.mutedMid },
  errorBox: {
    alignItems: "center",
    backgroundColor: colors.dangerA,
    borderRadius: radius.control,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  errorText: { ...typography.caption, color: colors.text, flex: 1 },

  summary: { backgroundColor: colors.card, borderRadius: radius.lg, gap: 12, padding: space.lg },
  kcalRow: { alignItems: "baseline", flexDirection: "row", gap: 8 },
  kcal: { ...typography.display, color: colors.text, fontSize: 40, lineHeight: 44 },
  kcalUnit: { ...typography.label, color: colors.mutedMid },
  ratioBar: { borderRadius: 4, flexDirection: "row", gap: 2, height: 8, overflow: "hidden" },
  macroRow: { flexDirection: "row", gap: 8 },
  macro: { flex: 1, gap: 2 },
  macroHead: { alignItems: "center", flexDirection: "row", gap: 5 },
  macroDot: { borderRadius: 3, height: 6, width: 6 },
  macroLabel: { ...typography.micro, color: colors.mutedMid },
  macroValue: { ...typography.label, color: colors.text, fontSize: 15, fontVariant: ["tabular-nums"] },

  sectionLabel: { ...typography.stat, color: colors.mutedMid, marginTop: 4 },
  sectionLabelTight: { ...typography.stat, color: colors.mutedMid },
  items: { gap: 8 },
  empty: { ...typography.caption, color: colors.mutedMid },
  itemRow: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 8,
  },
  itemText: { flex: 1, gap: 2 },
  itemName: { ...typography.body, color: colors.text },
  itemKcal: { ...typography.micro, color: colors.mutedMid },
  itemWeight: { alignItems: "center", flexDirection: "row", gap: 4 },
  itemWeightInput: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderColor: colors.borderMid,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontVariant: ["tabular-nums"],
    minWidth: 62,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: "right",
  },
  unit: { ...typography.label, color: colors.mutedMid },
  itemRemove: { alignItems: "center", height: 40, justifyContent: "center", width: 36 },

  amountRow: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.control,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  amountLabel: { ...typography.label, color: colors.mutedMid, fontSize: 14 },
  amountField: { alignItems: "center", flexDirection: "row", gap: 6 },
  amountInput: {
    color: colors.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 24,
    fontVariant: ["tabular-nums"],
    paddingVertical: 4,
    textAlign: "right",
    width: 96,
  },

  refineHint: { alignItems: "center", alignSelf: "center", flexDirection: "row", gap: 6, minHeight: 44 },
  refineHintText: { ...typography.label, color: colors.accent, fontSize: 13 },
  refineBox: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.control, borderWidth: 1, gap: 10, padding: 14 },
  refineInput: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    minHeight: 72,
    padding: 12,
    textAlignVertical: "top",
  },
  refineLoading: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "center", paddingVertical: 4 },
  refineLoadingText: { ...typography.caption, color: colors.mutedMid },

  deleteRow: { alignItems: "center", alignSelf: "center", flexDirection: "row", gap: 6, minHeight: 44, paddingHorizontal: 12 },
  deleteText: { ...typography.label, color: colors.danger, fontSize: 14 },

  footer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: space.xl,
    paddingTop: 12,
    paddingBottom: 8,
  },
});
