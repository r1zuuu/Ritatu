import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Sheet } from "../../components/Sheet";
import { persistProgressPhotoFile } from "../../data/progressPhotoRepository";
import type { ProgressPhoto, ProgressPhotoAngle } from "../../data/types";
import { colors } from "../../theme/colors";
import { radius, space } from "../../theme/layout";
import { typography } from "../../theme/typography";

const ANGLE_LABELS: Record<ProgressPhotoAngle, string> = { front: "Przód", side: "Bok", back: "Tył", other: "Inne" };

export const angleLabel = (angle: ProgressPhotoAngle) => ANGLE_LABELS[angle];

const ANGLES = (Object.keys(ANGLE_LABELS) as ProgressPhotoAngle[]).map((value) => ({ value, label: ANGLE_LABELS[value] }));

type Props = {
  visible: boolean;
  currentWeight?: number;
  onClose: () => void;
  onSave: (photo: ProgressPhoto) => Promise<void>;
};

// Pick first, then see the photo while tagging it: saving straight from the
// picker gave no chance to check the shot or change the angle.
export const AddProgressPhotoSheet = ({ visible, currentWeight, onClose, onSave }: Props) => {
  const [uri, setUri] = useState<string | null>(null);
  const [angle, setAngle] = useState<ProgressPhotoAngle>("front");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setUri(null);
    setAngle("front");
    setNote("");
    setError(null);
  }, [visible]);

  const pick = async (camera: boolean) => {
    setError(null);
    const permission = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(camera ? "Ritatu potrzebuje dostępu do aparatu." : "Ritatu potrzebuje dostępu do galerii.");
      return;
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (!result.canceled) setUri(result.assets[0].uri);
  };

  const save = async () => {
    if (!uri) return;
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    setBusy(true);
    try {
      const stored = await persistProgressPhotoFile(uri, id);
      await onSave({ id, uri: stored, angle, note: note.trim() || null, weightKg: currentWeight ?? null, createdAt: new Date() });
      onClose();
    } catch {
      setError("Nie udało się zapisać zdjęcia. Spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Zdjęcie postępu" height="fit">
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        {uri ? (
          <View style={s.previewWrap}>
            <Image source={{ uri }} style={s.preview} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zmień zdjęcie"
              style={({ pressed }) => [s.change, pressed && s.pressed]}
              onPress={() => setUri(null)}
            >
              <Icon name="reset" size={16} color={colors.text} />
              <Text style={s.changeText}>Zmień</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.pickRow}>
            <Pressable accessibilityRole="button" style={({ pressed }) => [s.pick, pressed && s.pressed]} onPress={() => void pick(true)}>
              <Icon name="camera" size={26} color={colors.accent} />
              <Text style={s.pickText}>Zrób zdjęcie</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={({ pressed }) => [s.pick, pressed && s.pressed]} onPress={() => void pick(false)}>
              <Icon name="image" size={26} color={colors.accent} />
              <Text style={s.pickText}>Z galerii</Text>
            </Pressable>
          </View>
        )}
        {!uri ? (
          <Text style={s.tip}>Najlepiej w tym samym miejscu i świetle, rano, żeby zdjęcia dało się porównać.</Text>
        ) : null}

        <Text style={s.label}>Ujęcie</Text>
        <SegmentedControl items={ANGLES} value={angle} onChange={setAngle} />
        <TextInput
          accessibilityLabel="Notatka do zdjęcia"
          style={s.note}
          value={note}
          onChangeText={setNote}
          placeholder="Notatka (opcjonalnie)"
          placeholderTextColor={colors.muted}
        />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Button title={busy ? "Zapisuję..." : "Zapisz zdjęcie"} icon="check" disabled={!uri || busy} onPress={() => void save()} />
      </ScrollView>
    </Sheet>
  );
};

const s = StyleSheet.create({
  wrap: { gap: 12, paddingBottom: space.lg, paddingHorizontal: space.xl },
  pressed: { opacity: 0.7 },
  pickRow: { flexDirection: "row", gap: 10 },
  pick: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    justifyContent: "center",
    minHeight: 110,
  },
  pickText: { ...typography.label, color: colors.text },
  tip: { ...typography.caption, color: colors.mutedMid },
  previewWrap: { alignSelf: "center", width: "70%" },
  preview: { aspectRatio: 3 / 4, backgroundColor: colors.card, borderRadius: radius.lg, width: "100%" },
  change: {
    alignItems: "center",
    backgroundColor: colors.scrim,
    borderRadius: radius.pill,
    bottom: 10,
    flexDirection: "row",
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 12,
    position: "absolute",
    right: 10,
  },
  changeText: { ...typography.label, color: colors.text },
  label: { ...typography.label, color: colors.mutedMid, marginTop: 4 },
  note: {
    ...typography.body,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  error: { ...typography.caption, color: colors.danger },
});
