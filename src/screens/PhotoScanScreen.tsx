import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { MacroConfirmSheet } from "../components/MacroConfirmSheet";
import { Screen } from "../components/Screen";
import type { MealDraft } from "../data/types";
import { useMeals } from "../providers/MealsProvider";
import { getDeveloperSettings } from "../data/developerRepository";
import { analyzeMealPhoto } from "../services/gptVisionService";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

export const PhotoScanScreen = () => {
  const { addMeal } = useMeals();
  const params = useLocalSearchParams<{ section?: string }>();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [draft, setDraft] = useState<MealDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async (camera: boolean) => {
    setError(null);
    const permission = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError("Brak uprawnień do zdjęć.");
      return;
    }

    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.75, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.75, base64: true });

    if (result.canceled) return;
    const asset = result.assets[0];

    if (!asset.base64) {
      setError("Nie udało się odczytać zdjęcia.");
      return;
    }

    setImageUri(asset.uri);
    setLoading(true);

    try {
      const settings = await getDeveloperSettings();
      if (settings.mockPhotoAiEnabled) {
        setDraft({
          name: "Makaron z kurczakiem",
          weightG: 360,
          proteinPer100g: 11.5,
          carbsPer100g: 24,
          fatPer100g: 5.2,
          source: "photo",
          section: params.section ?? null,
          photoUrl: asset.uri,
          note: "Wynik mock z panelu developerskiego.",
          confidence: "medium",
        });
        return;
      }

      const analysis = await analyzeMealPhoto(asset.base64, asset.mimeType ?? "image/jpeg");
      setDraft({
        name: analysis.dish_name,
        weightG: analysis.estimated_weight_g,
        proteinPer100g: analysis.protein_per_100g,
        carbsPer100g: analysis.carbs_per_100g,
        fatPer100g: analysis.fat_per_100g,
        source: "photo",
        section: params.section ?? null,
        photoUrl: asset.uri,
        note: analysis.note,
        confidence: analysis.confidence,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się przeanalizować zdjęcia.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.wrap}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [styles.back, pressed && styles.pressed]} onPress={() => router.back()}>
            <Icon name="chevron-left" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.eyebrow}>Zdjęcie posiłku</Text>
          <Text style={styles.title}>AI rozpozna danie, Ty zatwierdzisz gramaturę</Text>
        </View>

        <View style={styles.preview}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.emptyPreview}>
              <Icon name="camera" size={42} color={colors.accent} />
              <Text style={styles.emptyTitle}>Dodaj zdjęcie talerza</Text>
              <Text style={styles.emptyText}>Najlepiej z góry, w dobrym świetle, z widoczną porcją.</Text>
            </View>
          )}
          {loading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.loadingText}>Analizuję zdjęcie...</Text>
            </View>
          ) : null}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="alert" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button title="Zrób zdjęcie" icon="camera" onPress={() => void pickImage(true)} disabled={loading} />
          <Button title="Wybierz z galerii" icon="image" variant="secondary" onPress={() => void pickImage(false)} disabled={loading} />
        </View>
      </View>

      <MacroConfirmSheet
        visible={Boolean(draft)}
        draft={draft}
        onClose={() => setDraft(null)}
        onConfirm={async (confirmed) => {
          await addMeal(confirmed);
          setDraft(null);
          router.replace("/home");
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 18 },
  header: { gap: 8 },
  back: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, borderWidth: 1, height: 42, justifyContent: "center", marginBottom: 6, width: 42 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.96 }] },
  eyebrow: { ...typography.label, color: colors.accent, textTransform: "uppercase" },
  title: { ...typography.title, color: colors.text },
  preview: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 24, borderWidth: 1, flex: 1, minHeight: 320, overflow: "hidden" },
  image: { height: "100%", width: "100%" },
  emptyPreview: { alignItems: "center", flex: 1, gap: 10, justifyContent: "center", padding: 28 },
  emptyTitle: { ...typography.section, color: colors.text, textAlign: "center" },
  emptyText: { ...typography.body, color: colors.muted, textAlign: "center" },
  loadingOverlay: { ...StyleSheet.absoluteFill, alignItems: "center", backgroundColor: "rgba(10,10,14,0.78)", gap: 12, justifyContent: "center" },
  loadingText: { ...typography.label, color: colors.text },
  errorBox: { alignItems: "center", backgroundColor: "rgba(255,79,107,0.12)", borderColor: "rgba(255,79,107,0.28)", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, padding: 12 },
  errorText: { ...typography.label, color: colors.text, flex: 1 },
  actions: { gap: 10 },
});
