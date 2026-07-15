import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { calculateKcal, calculateMealMacros, round, totalsToPer100g } from "../core/macroCalculator";
import { SECTIONS, getSectionByTime } from "../core/section";
import type { Section } from "../core/section";
import type { MealDraft, VisionItem } from "../data/types";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { Button } from "./Button";
import { TextField } from "./TextField";

type MacroConfirmSheetProps = {
  visible: boolean;
  draft: MealDraft | null;
  // Tryb "zdjęcie": edytowalna lista składników. Nieobecne = tryb gramatury.
  items?: VisionItem[];
  warning?: string | null;
  onClose: () => void;
  onConfirm: (draft: MealDraft) => Promise<void>;
  onRefine?: (userContext: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  editingMealId?: string;
};

const toNumber = (value: string) => Number(value.replace(",", "."));

// Reprezentacja składnika w edytorze: makra per 100g są stałe (z modelu),
// zmienna jest tylko waga (weightText). Makra liczymy z per100g * waga/100,
// więc edycja wagi nigdy nie rozjeżdża makr.
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
}: MacroConfirmSheetProps) => {
  const isEditing = Boolean(editingMealId);
  const itemsMode = items !== undefined;

  const [weight, setWeight] = useState(String(draft?.weightG ?? 100));
  const [editItems, setEditItems] = useState<EditItem[]>(() => (items ? items.map(toEditItem) : []));
  const [section, setSection] = useState<Section>(
    (draft?.section as Section | null | undefined) ?? getSectionByTime(),
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineText, setRefineText] = useState("");
  const [refining, setRefining] = useState(false);

  useEffect(() => {
    setWeight(String(draft?.weightG ?? 100));
    setEditItems(items ? items.map(toEditItem) : []);
    setSection((draft?.section as Section | null | undefined) ?? getSectionByTime());
    setSaving(false);
    setDeleting(false);
    setRefineOpen(false);
    setRefineText("");
    setRefining(false);
  }, [draft, items]);

  const macros = useMemo(() => {
    if (!draft) return null;
    if (itemsMode) {
      const t = editItems.reduce(
        (acc, it) => {
          const w = toNumber(it.weightText);
          const factor = Number.isFinite(w) && w > 0 ? w / 100 : 0;
          return {
            proteinG: acc.proteinG + it.proteinPer100g * factor,
            carbsG: acc.carbsG + it.carbsPer100g * factor,
            fatG: acc.fatG + it.fatPer100g * factor,
            weightG: acc.weightG + (Number.isFinite(w) && w > 0 ? w : 0),
          };
        },
        { proteinG: 0, carbsG: 0, fatG: 0, weightG: 0 },
      );
      return { ...t, kcal: calculateKcal(t.proteinG, t.carbsG, t.fatG) };
    }
    const w = toNumber(weight);
    return { ...calculateMealMacros(draft, w), weightG: w };
  }, [draft, itemsMode, editItems, weight]);

  if (!draft) return null;

  const busy = saving || deleting || refining;
  const canSave = itemsMode
    ? editItems.length > 0 && !busy
    : Number.isFinite(toNumber(weight)) && toNumber(weight) > 0 && !busy;

  const updateItemWeight = (index: number, text: string) =>
    setEditItems((prev) => prev.map((it, i) => (i === index ? { ...it, weightText: text } : it)));

  const removeItem = (index: number) =>
    setEditItems((prev) => prev.filter((_, i) => i !== index));

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        accessible
        accessibilityLabel={isEditing ? "Edycja posiłku" : "Potwierdzenie posiłku"}
        style={styles.sheet}
      >
        <Text style={styles.eyebrow}>{isEditing ? "Edytujesz posiłek" : "Potwierdź posiłek"}</Text>
        <Text style={styles.title}>{draft.name}</Text>
        {warning ? <Text style={styles.warning}>{warning}</Text> : null}
        {draft.note ? <Text style={styles.note}>{draft.note}</Text> : null}
        {!isEditing && draft.confidence ? (
          <Text style={styles.note}>Pewność AI: {draft.confidence}</Text>
        ) : null}

        {/* Section picker */}
        <View style={styles.sectionRow}>
          {SECTIONS.map((s) => (
            <Pressable
              key={s}
              style={({ pressed }) => [
                styles.sectionChip,
                section === s && styles.sectionChipActive,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => setSection(s)}
              disabled={busy}
            >
              <Text style={[styles.sectionChipLabel, section === s && styles.sectionChipLabelActive]}>
                {s}
              </Text>
            </Pressable>
          ))}
        </View>

        {itemsMode ? (
          <View style={styles.itemsList}>
            {editItems.length === 0 ? (
              <Text style={styles.note}>Brak wykrytych składników.</Text>
            ) : (
              editItems.map((it, index) => (
                <View key={`${it.name}-${index}`} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {it.name}
                  </Text>
                  <View style={styles.itemWeight}>
                    <TextInput
                      style={styles.itemWeightInput}
                      value={it.weightText}
                      onChangeText={(t) => updateItemWeight(index, t)}
                      keyboardType="decimal-pad"
                      editable={!busy}
                    />
                    <Text style={styles.itemUnit}>g</Text>
                  </View>
                  <Pressable
                    onPress={() => removeItem(index)}
                    hitSlop={8}
                    disabled={busy}
                    style={({ pressed }) => [styles.itemRemove, pressed && { opacity: 0.5 }]}
                    accessibilityLabel={`Usuń ${it.name}`}
                  >
                    <Text style={styles.itemRemoveText}>✕</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
        ) : (
          <TextField
            label="Gramatura (g)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
          />
        )}

        {macros ? (
          <View style={styles.preview}>
            <Text style={styles.previewValue}>{round(macros.kcal)} kcal</Text>
            <Text style={styles.previewMeta}>
              B {round(macros.proteinG)} g · W {round(macros.carbsG)} g · T {round(macros.fatG)} g
              {itemsMode ? ` · ${round(macros.weightG)} g` : ""}
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          {isEditing && onDelete ? (
            <Button
              title={deleting ? "Usuwam..." : "Usuń"}
              variant="secondary"
              disabled={busy}
              onPress={async () => {
                setDeleting(true);
                await onDelete();
                setDeleting(false);
              }}
            />
          ) : (
            <Button title="Anuluj" variant="secondary" onPress={onClose} disabled={busy} />
          )}
          <Button
            title={saving ? "Zapisuję..." : "Zapisz"}
            disabled={!canSave}
            onPress={async () => {
              setSaving(true);
              if (itemsMode && macros) {
                const per100g = totalsToPer100g(
                  macros.weightG,
                  macros.proteinG,
                  macros.carbsG,
                  macros.fatG,
                );
                await onConfirm({ ...draft, ...per100g, section });
              } else {
                await onConfirm({ ...draft, weightG: toNumber(weight), section });
              }
              setSaving(false);
            }}
          />
        </View>

        {onRefine ? (
          refineOpen ? (
            <View style={styles.refineBox}>
              <Text style={styles.refineLabel}>Co poprawić?</Text>
              <TextInput
                style={styles.refineInput}
                placeholder="np. za mało gramów, to był mały talerz"
                value={refineText}
                onChangeText={setRefineText}
                placeholderTextColor={colors.muted}
                multiline
              />
              <View style={styles.refineActions}>
                <Button
                  title="Anuluj"
                  variant="secondary"
                  onPress={() => { setRefineOpen(false); setRefineText(""); }}
                  disabled={refining}
                />
                <Button
                  title={refining ? "Analizuję..." : "Popraw z AI"}
                  disabled={!refineText.trim() || refining}
                  onPress={async () => {
                    setRefining(true);
                    try {
                      await onRefine(refineText.trim());
                      setRefineOpen(false);
                      setRefineText("");
                    } finally {
                      setRefining(false);
                    }
                  }}
                />
              </View>
              {refining ? (
                <View style={styles.refineLoading}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={styles.refineLoadingText}>AI analizuje ponownie...</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.refineHint, pressed && { opacity: 0.7 }]}
              onPress={() => setRefineOpen(true)}
              disabled={busy}
            >
              <Text style={styles.refineHintText}>Wynik nieprecyzyjny? Popraw z AI →</Text>
            </Pressable>
          )
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    gap: 14,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  warning: { color: colors.danger, fontWeight: "800" },
  note: { color: colors.muted, fontWeight: "700" },

  sectionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  sectionChip: {
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sectionChipActive: {
    backgroundColor: colors.accentA,
    borderColor: colors.accent,
  },
  sectionChipLabel: {
    ...typography.label,
    color: colors.muted,
    fontSize: 12,
  },
  sectionChipLabelActive: {
    color: colors.accent,
  },

  itemsList: { gap: 8 },
  itemRow: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  itemName: { ...typography.body, color: colors.text, flex: 1 },
  itemWeight: { alignItems: "center", flexDirection: "row", gap: 3 },
  itemWeightInput: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    minWidth: 56,
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: "right",
  },
  itemUnit: { ...typography.label, color: colors.muted },
  itemRemove: { paddingHorizontal: 4, paddingVertical: 2 },
  itemRemoveText: { color: colors.muted, fontSize: 16, fontWeight: "900" },

  preview: {
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    padding: 14,
    gap: 4,
  },
  previewValue: { color: colors.text, fontSize: 24, fontWeight: "900" },
  previewMeta: { color: colors.muted, fontWeight: "800" },

  actions: { flexDirection: "row", gap: 10 },

  refineHint: { alignSelf: "center", paddingVertical: 6 },
  refineHintText: { color: colors.accent, fontSize: 13, fontWeight: "600" },
  refineBox: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  refineLabel: {
    color: colors.mutedMid,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  refineActions: { flexDirection: "row", gap: 10 },
  refineLoading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 4,
  },
  refineLoadingText: { color: colors.muted, fontSize: 13 },
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
});
