import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { MacroConfirmSheet } from "../components/MacroConfirmSheet";
import { Screen } from "../components/Screen";
import type { MealDraft } from "../data/types";
import { useMeals } from "../providers/MealsProvider";
import { analyzeMealPhoto } from "../services/gptVisionService";
import { colors } from "../theme/colors";

export const PhotoScanScreen = () => {
  const { addMeal } = useMeals();
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
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.75,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.75,
          base64: true,
        });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      setError("Nie udało się odczytać zdjęcia.");
      return;
    }

    setImageUri(asset.uri);
    setLoading(true);

    try {
      const analysis = await analyzeMealPhoto(asset.base64, asset.mimeType ?? "image/jpeg");
      setDraft({
        name: analysis.dish_name,
        weightG: analysis.estimated_weight_g,
        proteinPer100g: analysis.protein_per_100g,
        carbsPer100g: analysis.carbs_per_100g,
        fatPer100g: analysis.fat_per_100g,
        source: "photo",
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
          <Text style={styles.eyebrow}>Zdjęcie</Text>
          <Text style={styles.title}>AI szacuje, Ty zatwierdzasz</Text>
        </View>

        {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : <View style={styles.placeholder} />}
        {loading ? <ActivityIndicator color={colors.text} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <Button title="Zrób zdjęcie" onPress={() => void pickImage(true)} disabled={loading} />
          <Button title="Wybierz z galerii" variant="secondary" onPress={() => void pickImage(false)} disabled={loading} />
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
  wrap: {
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    gap: 8,
  },
  eyebrow: {
    color: colors.muted,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "900",
  },
  placeholder: {
    height: 260,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  image: {
    height: 260,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
  },
  actions: {
    gap: 12,
  },
  error: {
    color: colors.danger,
    fontWeight: "800",
  },
});
