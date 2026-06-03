import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Sheet } from "../../components/Sheet";
import { Icon } from "../../components/Icon";
import { persistProgressPhotoFile } from "../../data/progressPhotoRepository";
import type { ProgressPhoto, ProgressPhotoAngle } from "../../data/types";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { sh } from "../../theme/sharedStyles";

export function angleLabel(angle: ProgressPhotoAngle): string {
  const labels: Record<ProgressPhotoAngle, string> = {
    front: "Przód",
    side: "Bok",
    back: "Tył",
    other: "Inne",
  };
  return labels[angle];
}

type Props = {
  visible: boolean;
  currentWeight?: number;
  onClose: () => void;
  onSave: (photo: ProgressPhoto) => Promise<void>;
};

export const AddProgressPhotoSheet = ({ visible, currentWeight, onClose, onSave }: Props) => {
  const [angle, setAngle] = useState<ProgressPhotoAngle>("front");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (camera: boolean) => {
    setError(null);
    const permission = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError("Brak uprawnień do zdjęć."); return; }

    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (result.canceled) return;

    const asset = result.assets[0];
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

    setBusy(true);
    try {
      const uri = await persistProgressPhotoFile(asset.uri);
      await onSave({ id, uri, angle, note: note.trim() || null, weightKg: currentWeight ?? null, createdAt: new Date() });
      setNote("");
      setAngle("front");
      onClose();
    } catch {
      setError("Nie udało się zapisać zdjęcia.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Zdjęcie postępu" height="58%">
      <View style={s.wrap}>
        <Text style={s.label}>Ujęcie</Text>
        <View style={s.angles}>
          {(["front", "side", "back", "other"] as ProgressPhotoAngle[]).map((item) => {
            const active = angle === item;
            return (
              <Pressable
                key={item}
                style={({ pressed }) => [s.angle, active && s.angleActive, pressed && sh.pressed]}
                onPress={() => setAngle(item)}
              >
                <Text style={[s.angleText, active && s.angleTextActive]}>{angleLabel(item)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={s.label}>Notatka</Text>
        <TextInput
          style={s.note}
          value={note}
          onChangeText={setNote}
          placeholder="Opcjonalnie"
          placeholderTextColor={colors.muted}
          multiline
        />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <View style={s.actions}>
          <Pressable
            disabled={busy}
            style={({ pressed }) => [sh.cta, busy && sh.disabled, pressed && !busy && sh.pressed]}
            onPress={() => void pick(true)}
          >
            <Icon name="camera" size={18} color={colors.warmBlack} />
            <Text style={sh.ctaText}>Aparat</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            style={({ pressed }) => [s.secondary, busy && sh.disabled, pressed && !busy && sh.pressed]}
            onPress={() => void pick(false)}
          >
            <Icon name="image" size={18} color={colors.text} />
            <Text style={s.secondaryText}>Galeria</Text>
          </Pressable>
        </View>
      </View>
    </Sheet>
  );
};

const s = StyleSheet.create({
  wrap: { gap: 12, paddingBottom: 24, paddingHorizontal: 20 },
  label: { ...typography.label, color: colors.mutedMid, textTransform: "uppercase" },
  angles: { flexDirection: "row", gap: 8 },
  angle: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flex: 1, height: 40, justifyContent: "center" },
  angleActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  angleText: { ...typography.label, color: colors.mutedMid },
  angleTextActive: { color: colors.warmBlack },
  note: { ...typography.body, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.text, minHeight: 84, padding: 12, textAlignVertical: "top" },
  error: { ...typography.label, color: colors.danger },
  actions: { gap: 10, marginTop: 4 },
  secondary: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 8, height: 52, justifyContent: "center" },
  secondaryText: { ...typography.button, color: colors.text },
});
