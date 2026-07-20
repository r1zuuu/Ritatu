import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { MacroConfirmSheet } from "../components/MacroConfirmSheet";
import { Screen } from "../components/Screen";
import { calculateMealMacros, totalsToPer100g } from "../core/macroCalculator";
import type { MealDraft, VisionItem, VisionMealResult } from "../data/types";
import { getDeveloperSettings } from "../data/developerRepository";
import { useMeals } from "../providers/MealsProvider";
import { analyzeMealPhoto, refineMealAnalysis } from "../services/gptVisionService";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

type Phase = "idle" | "ready" | "analyzing" | "done";

export const PhotoScanScreen = () => {
  const { addMeal } = useMeals();
  const params = useLocalSearchParams<{ section?: string }>();

  const [phase, setPhase] = useState<Phase>("idle");
  const [mealTitle, setMealTitle] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState("image/jpeg");
  const [draft, setDraft] = useState<MealDraft | null>(null);
  const [items, setItems] = useState<VisionItem[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  // Bumped on every analysis start / cancel / timeout. A resolved request only
  // applies if its id is still current — lets us "cancel" without threading an
  // AbortSignal through the whole vision service. ponytail: ignores stale
  // results rather than truly aborting the fetch.
  const runIdRef = useRef(0);

  const pickImage = async (camera: boolean) => {
    setError(null);
    const permission = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      if (permission.canAskAgain) {
        setError(camera ? "Brak dostępu do aparatu." : "Brak dostępu do galerii.");
      } else {
        setError("Dostęp odrzucony — włącz go w ustawieniach systemu.");
        void Linking.openSettings();
      }
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
    setImageBase64(asset.base64);
    setImageMimeType(asset.mimeType ?? "image/jpeg");
    setDraft(null);
    setPhase("ready");
  };

  const applyAnalysis = (analysis: VisionMealResult, uri: string) => {
    setWarning(null);
    setItems(analysis.items);
    setDraft({
      name: mealTitle.trim() || analysis.dish_name,
      ...totalsToPer100g(
        analysis.total_weight_g,
        analysis.protein_g,
        analysis.carbs_g,
        analysis.fat_g,
      ),
      source: "photo",
      section: params.section ?? null,
      photoUrl: uri,
      note: analysis.note,
      confidence: analysis.confidence,
    });
    setPhase("done");
    setSheetOpen(true);
  };

  const runAnalysis = async () => {
    if (!imageBase64 || !imageUri) return;
    setError(null);
    setWarning(null);
    setPhase("analyzing");
    const runId = ++runIdRef.current;
    const timeout = setTimeout(() => {
      if (runIdRef.current !== runId) return;
      runIdRef.current++;
      setError("Analiza trwa zbyt długo. Spróbuj ponownie.");
      setPhase("ready");
    }, 45_000);

    try {
      const settings = await getDeveloperSettings();
      if (settings.mockPhotoAiEnabled) {
        applyAnalysis(
          {
            dish_name: mealTitle.trim() || "Makaron z kurczakiem",
            confidence: "medium",
            items: [
              { name: "Makaron", weight_g: 200, protein_g: 12, carbs_g: 62, fat_g: 2 },
              { name: "Kurczak", weight_g: 120, protein_g: 29, carbs_g: 0, fat_g: 5 },
              { name: "Sos", weight_g: 80, protein_g: 0, carbs_g: 24, fat_g: 12 },
            ],
            total_weight_g: 400,
            protein_g: 41,
            carbs_g: 86,
            fat_g: 19,
            note: "Wynik mock z panelu developerskiego.",
          },
          imageUri,
        );
        return;
      }

      const analysis = await analyzeMealPhoto(
        imageBase64,
        imageMimeType,
        mealTitle.trim() || undefined,
      );
      if (runIdRef.current !== runId) return;
      applyAnalysis(analysis, imageUri);
    } catch (err) {
      if (runIdRef.current !== runId) return;
      setError(err instanceof Error ? err.message : "Nie udało się przeanalizować zdjęcia.");
      setPhase("ready");
    } finally {
      clearTimeout(timeout);
    }
  };

  const cancelAnalysis = () => {
    runIdRef.current++;
    setPhase("ready");
  };

  const handleRefine = async (userContext: string) => {
    if (!imageBase64 || !draft) return;
    const totals = calculateMealMacros(draft, draft.weightG);
    const previous: VisionMealResult = {
      dish_name: draft.name,
      confidence: draft.confidence ?? "medium",
      items,
      total_weight_g: draft.weightG,
      protein_g: totals.proteinG,
      carbs_g: totals.carbsG,
      fat_g: totals.fatG,
      note: draft.note ?? null,
    };
    try {
      const refined = await refineMealAnalysis(imageBase64, imageMimeType, previous, userContext);
      applyAnalysis(refined, imageUri!);
    } catch (err) {
      setWarning(err instanceof Error ? err.message : "Nie udało się poprawić analizy.");
    }
  };

  const resetPhoto = () => {
    setPhase("idle");
    setImageUri(null);
    setImageBase64(null);
    setDraft(null);
    setItems([]);
    setSheetOpen(false);
    setError(null);
  };

  return (
    <Screen>
      <View style={styles.wrap}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            onPress={() => router.back()}
          >
            <Icon name="chevron-left" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.eyebrow}>Zdjęcie posiłku</Text>
          <Text style={styles.title}>
            {phase === "idle"
              ? "Zrób zdjęcie i opisz posiłek"
              : phase === "analyzing"
                ? "AI analizuje zdjęcie..."
                : phase === "done"
                  ? "Gotowe — sprawdź wynik"
                  : "Opisz posiłek i analizuj"}
          </Text>
        </View>

        {/* Photo preview */}
        <View style={styles.preview}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.emptyPreview}>
              <Icon name="camera" size={42} color={colors.accent} />
              <Text style={styles.emptyTitle}>Zrób zdjęcie posiłku</Text>
            </View>
          )}

          {phase === "analyzing" ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={colors.accent} size="large" />
              <Text style={styles.loadingText}>Analizuję zdjęcie...</Text>
            </View>
          ) : null}

          {/* Retake button — shows when photo is set */}
          {phase !== "idle" && phase !== "analyzing" ? (
            <Pressable
              style={({ pressed }) => [styles.retakeBtn, pressed && styles.pressed]}
              onPress={resetPhoto}
            >
              <Icon name="reset" size={16} color={colors.text} />
              <Text style={styles.retakeBtnText}>Zmień</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Icon name="alert" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Title input — only after photo is taken */}
        {phase !== "idle" ? (
          <View style={styles.titleBox}>
            <TextInput
              style={styles.titleInput}
              placeholder="np. obiad u mamy, kurczak z ryżem..."
              placeholderTextColor={colors.muted}
              value={mealTitle}
              onChangeText={setMealTitle}
              returnKeyType="done"
              editable={phase !== "analyzing"}
            />
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
          {phase === "idle" ? (
            <>
              <Button
                title="Zrób zdjęcie"
                icon="camera"
                onPress={() => void pickImage(true)}
              />
              <Button
                title="Wybierz z galerii"
                icon="image"
                variant="secondary"
                onPress={() => void pickImage(false)}
              />
            </>
          ) : phase === "ready" ? (
            <>
              <Button
                title="Analizuj zdjęcie"
                icon="sparkles"
                onPress={() => void runAnalysis()}
              />
              <Button
                title="Zrób nowe zdjęcie"
                icon="camera"
                variant="secondary"
                onPress={() => void pickImage(true)}
              />
            </>
          ) : phase === "analyzing" ? (
            <Button title="Anuluj analizę" variant="secondary" icon="x" onPress={cancelAnalysis} />
          ) : (
            // done — draft ready, sheet was closed
            <>
              <Button
                title="Zobacz wynik"
                icon="check"
                onPress={() => setSheetOpen(true)}
              />
              <Button
                title="Analizuj ponownie"
                icon="reset"
                variant="secondary"
                onPress={() => void runAnalysis()}
              />
            </>
          )}
        </View>
      </View>

      <MacroConfirmSheet
        visible={sheetOpen}
        draft={draft}
        items={items}
        warning={warning}
        onClose={() => setSheetOpen(false)}
        onConfirm={async (confirmed) => {
          await addMeal(confirmed);
          setDraft(null);
          setItems([]);
          router.replace("/home");
        }}
        onRefine={imageBase64 ? handleRefine : undefined}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 16 },
  header: { gap: 6 },
  back: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    marginBottom: 4,
    width: 42,
  },
  pressed: { opacity: 0.86, transform: [{ scale: 0.96 }] },
  eyebrow: { ...typography.label, color: colors.accent, textTransform: "uppercase" },
  title: { ...typography.title, color: colors.text },

  preview: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    minHeight: 260,
    overflow: "hidden",
  },
  image: { height: "100%", width: "100%" },
  emptyPreview: {
    alignItems: "center",
    flex: 1,
    gap: 10,
    justifyContent: "center",
    padding: 28,
  },
  emptyTitle: { ...typography.section, color: colors.text, textAlign: "center" },
  emptyText: { ...typography.body, color: colors.muted, textAlign: "center" },

  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    backgroundColor: "rgba(10,10,14,0.78)",
    gap: 14,
    justifyContent: "center",
  },
  loadingText: { ...typography.label, color: colors.text },

  retakeBtn: {
    alignItems: "center",
    backgroundColor: "rgba(10,10,14,0.62)",
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    bottom: 12,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: "absolute",
    right: 12,
  },
  retakeBtnText: { ...typography.label, color: colors.text },

  errorBox: {
    alignItems: "center",
    backgroundColor: "rgba(255,79,107,0.12)",
    borderColor: "rgba(255,79,107,0.28)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  errorText: { ...typography.label, color: colors.text, flex: 1 },

  titleBox: { gap: 6 },
  titleLabel: { ...typography.label, color: colors.mutedMid, textTransform: "uppercase" },
  titleInput: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  actions: { gap: 10 },
});
