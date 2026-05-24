import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { calculateMealMacros, round } from "../core/macroCalculator";
import type { MealDraft } from "../data/types";
import { colors } from "../theme/colors";
import { Button } from "./Button";
import { TextField } from "./TextField";

type MacroConfirmSheetProps = {
  visible: boolean;
  draft: MealDraft | null;
  warning?: string | null;
  onClose: () => void;
  onConfirm: (draft: MealDraft) => Promise<void>;
};

const toNumber = (value: string) => Number(value.replace(",", "."));

export const MacroConfirmSheet = ({
  visible,
  draft,
  warning,
  onClose,
  onConfirm,
}: MacroConfirmSheetProps) => {
  const [weight, setWeight] = useState(String(draft?.weightG ?? 100));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setWeight(String(draft?.weightG ?? 100));
    setSaving(false);
  }, [draft]);

  const macros = useMemo(() => {
    if (!draft) return null;
    return calculateMealMacros(draft, toNumber(weight));
  }, [draft, weight]);

  if (!draft) return null;

  const canSave = Number.isFinite(toNumber(weight)) && toNumber(weight) > 0 && !saving;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        accessibilityRole="summary"
        accessibilityLabel="Potwierdzenie posilku"
        style={styles.sheet}
      >
        <Text style={styles.eyebrow}>Potwierdź posiłek</Text>
        <Text style={styles.title}>{draft.name}</Text>
        {warning ? <Text style={styles.warning}>{warning}</Text> : null}
        {draft.note ? <Text style={styles.note}>{draft.note}</Text> : null}
        {draft.confidence ? <Text style={styles.note}>Pewność AI: {draft.confidence}</Text> : null}

        <TextField
          label="Gramatura"
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
        />

        {macros ? (
          <View style={styles.preview}>
            <Text style={styles.previewValue}>{round(macros.kcal)} kcal</Text>
            <Text style={styles.previewMeta}>
              B {round(macros.proteinG)} g · W {round(macros.carbsG)} g · T {round(macros.fatG)} g
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            title="Anuluj"
            variant="secondary"
            onPress={onClose}
            disabled={saving}
            accessibilityHint="Zamyka potwierdzenie bez zapisywania posilku"
          />
          <Button
            title={saving ? "Zapisuję..." : "Zapisz"}
            disabled={!canSave}
            accessibilityHint="Zapisuje posilek z podana gramatura"
            onPress={async () => {
              setSaving(true);
              await onConfirm({ ...draft, weightG: toNumber(weight) });
              setSaving(false);
            }}
          />
        </View>
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
  warning: {
    color: colors.danger,
    fontWeight: "800",
  },
  note: {
    color: colors.muted,
    fontWeight: "700",
  },
  preview: {
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    padding: 14,
    gap: 4,
  },
  previewValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  previewMeta: {
    color: colors.muted,
    fontWeight: "800",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
});
