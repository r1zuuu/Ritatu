import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { MacroConfirmSheet, type RefineInput } from "../components/MacroConfirmSheet";
import { Screen } from "../components/Screen";
import { formatDayLabel } from "../core/date";
import { totalsToPer100g } from "../core/macroCalculator";
import { isSection, type Section } from "../core/section";
import type { MealDraft, VisionItem, VisionMealResult } from "../data/types";
import { getDeveloperSettings } from "../data/developerRepository";
import { useMeals } from "../providers/MealsProvider";
import { analyzeMealPhoto, refineMealAnalysis } from "../services/visionService";
import { colors } from "../theme/colors";
import { radius, space } from "../theme/layout";
import { fontFamilies, typography } from "../theme/typography";

type Phase = "idle" | "ready" | "analyzing" | "done";

const TITLES: Record<Phase, string> = {
  idle: "Zrób zdjęcie posiłku",
  ready: "Opisz i analizuj",
  analyzing: "Analizuję...",
  done: "Gotowe, sprawdź wynik",
};

// Shown one after another while waiting, so a 3–10 s wait reads as progress.
const STAGES = ["Rozpoznaję składniki...", "Szacuję wielkość porcji...", "Liczę kalorie i makro..."];

const MOCK_RESULT: VisionMealResult = {
  dish_name: "Makaron z kurczakiem",
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
};

const sumItems = (items: VisionItem[]) =>
  items.reduce(
    (acc, it) => ({
      total_weight_g: acc.total_weight_g + it.weight_g,
      protein_g: acc.protein_g + it.protein_g,
      carbs_g: acc.carbs_g + it.carbs_g,
      fat_g: acc.fat_g + it.fat_g,
    }),
    { total_weight_g: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );

export const PhotoScanScreen = () => {
  const { addMeal, dateOffset, selectedDate } = useMeals();
  const params = useLocalSearchParams<{ section?: string }>();

  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState(0);
  const [mealTitle, setMealTitle] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState("image/jpeg");
  const [draft, setDraft] = useState<MealDraft | null>(null);
  const [items, setItems] = useState<VisionItem[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  // Bumped on every analysis start / cancel / timeout. A resolved request only
  // applies if its id is still current — lets us "cancel" without threading an
  // AbortSignal through the whole vision service. ponytail: ignores stale
  // results rather than truly aborting the fetch.
  const runIdRef = useRef(0);

  useEffect(() => {
    if (phase !== "analyzing") return undefined;
    setStage(0);
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1600);
    return () => clearInterval(timer);
  }, [phase]);

  const pickImage = async (camera: boolean) => {
    setError(null);
    setPermissionBlocked(false);
    const permission = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError(camera ? "Ritatu potrzebuje dostępu do aparatu." : "Ritatu potrzebuje dostępu do galerii.");
      setPermissionBlocked(!permission.canAskAgain);
      return;
    }

    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.75, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.75, base64: true });

    if (result.canceled) return;
    const asset = result.assets[0];

    if (!asset.base64) {
      setError("Nie udało się odczytać zdjęcia. Spróbuj innego.");
      return;
    }

    setImageUri(asset.uri);
    setImageBase64(asset.base64);
    setImageMimeType(asset.mimeType ?? "image/jpeg");
    setDraft(null);
    setPhase("ready");
  };

  const applyAnalysis = (analysis: VisionMealResult, uri: string, section?: Section) => {
    setItems(analysis.items);
    setDraft({
      name: mealTitle.trim() || analysis.dish_name,
      ...totalsToPer100g(analysis.total_weight_g, analysis.protein_g, analysis.carbs_g, analysis.fat_g),
      source: "photo",
      section: section ?? (isSection(params.section) ? params.section : null),
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
      const analysis = settings.mockPhotoAiEnabled
        ? MOCK_RESULT
        : await analyzeMealPhoto(imageBase64, imageMimeType, mealTitle.trim() || undefined);
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

  // Errors propagate to the sheet, which shows them inline.
  const handleRefine = async (userContext: string, current: RefineInput) => {
    if (!imageBase64 || !imageUri || !draft) return;
    const previous: VisionMealResult = {
      dish_name: draft.name,
      confidence: draft.confidence ?? "medium",
      items: current.items,
      ...sumItems(current.items),
      note: draft.note ?? null,
    };
    const refined = await refineMealAnalysis(imageBase64, imageMimeType, previous, userContext);
    applyAnalysis(refined, imageUri, current.section);
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
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Wróć"
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            onPress={() => router.back()}
          >
            <Icon name="chevron-left" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              Zdjęcie AI{dateOffset !== 0 ? ` · ${formatDayLabel(dateOffset, selectedDate)}` : ""}
            </Text>
            <Text style={styles.title}>{TITLES[phase]}</Text>
          </View>
        </View>

        <View style={styles.preview}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zrób zdjęcie"
              style={styles.emptyPreview}
              onPress={() => void pickImage(true)}
            >
              <View style={styles.emptyIcon}>
                <Icon name="camera" size={30} color={colors.accent} />
              </View>
              <Text style={styles.emptyText}>
                Zrób zdjęcie z góry, cały talerz w kadrze. Sztućce albo dłoń obok pomagają ocenić porcję.
              </Text>
            </Pressable>
          )}

          {phase === "analyzing" ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={colors.accent} size="large" />
              <Text style={styles.loadingText}>{STAGES[stage]}</Text>
            </View>
          ) : null}

          {phase === "ready" || phase === "done" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zmień zdjęcie"
              style={({ pressed }) => [styles.retakeBtn, pressed && styles.pressed]}
              onPress={resetPhoto}
            >
              <Icon name="reset" size={16} color={colors.text} />
              <Text style={styles.retakeBtnText}>Zmień zdjęcie</Text>
            </Pressable>
          ) : null}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Icon name="alert" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            {permissionBlocked ? (
              <Pressable accessibilityRole="button" hitSlop={8} onPress={() => void Linking.openSettings()}>
                <Text style={styles.errorAction}>Ustawienia</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {phase !== "idle" ? (
          <View style={styles.titleBox}>
            <Text style={styles.titleLabel}>Opis (opcjonalnie)</Text>
            <TextInput
              accessibilityLabel="Opis posiłku"
              style={styles.titleInput}
              placeholder="np. 2 jajka, 150 g ryżu, łyżka oliwy"
              placeholderTextColor={colors.muted}
              value={mealTitle}
              onChangeText={setMealTitle}
              returnKeyType="done"
              editable={phase !== "analyzing"}
            />
            <Text style={styles.titleHint}>Podane ilości AI przyjmie jako pewne, resztę oszacuje ze zdjęcia.</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          {phase === "idle" ? (
            <>
              <Button title="Zrób zdjęcie" icon="camera" onPress={() => void pickImage(true)} />
              <Button title="Wybierz z galerii" icon="image" variant="secondary" onPress={() => void pickImage(false)} />
            </>
          ) : phase === "ready" ? (
            <Button title="Analizuj zdjęcie" icon="sparkles" onPress={() => void runAnalysis()} />
          ) : phase === "analyzing" ? (
            <Button title="Anuluj analizę" variant="secondary" icon="x" onPress={cancelAnalysis} />
          ) : (
            <>
              <Button title="Zobacz wynik" icon="check" onPress={() => setSheetOpen(true)} />
              <Button title="Analizuj ponownie" icon="reset" variant="secondary" onPress={() => void runAnalysis()} />
            </>
          )}
        </View>
      </ScrollView>

      <MacroConfirmSheet
        visible={sheetOpen}
        draft={draft}
        items={items}
        onClose={() => setSheetOpen(false)}
        onConfirm={async (confirmed) => {
          await addMeal(confirmed);
          setSheetOpen(false);
          router.back();
        }}
        onRefine={imageBase64 ? handleRefine : undefined}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { gap: space.lg, padding: space.xl },
  header: { alignItems: "center", flexDirection: "row", gap: 12 },
  headerText: { flex: 1, gap: 2 },
  back: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  pressed: { opacity: 0.86, transform: [{ scale: 0.96 }] },
  eyebrow: { ...typography.stat, color: colors.accent },
  title: { ...typography.headline, color: colors.text },

  preview: {
    aspectRatio: 4 / 3,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  image: { height: "100%", width: "100%" },
  emptyPreview: { alignItems: "center", flex: 1, gap: 14, justifyContent: "center", padding: 28 },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: colors.accentA,
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  emptyText: { ...typography.caption, color: colors.mutedMid, maxWidth: 280, textAlign: "center" },

  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    backgroundColor: colors.scrim,
    gap: 14,
    justifyContent: "center",
  },
  loadingText: { ...typography.label, color: colors.text, fontSize: 14 },

  retakeBtn: {
    alignItems: "center",
    backgroundColor: colors.scrim,
    borderColor: colors.borderMid,
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: 12,
    flexDirection: "row",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    position: "absolute",
    right: 12,
  },
  retakeBtnText: { ...typography.label, color: colors.text },

  errorBox: {
    alignItems: "center",
    backgroundColor: colors.dangerA,
    borderRadius: radius.control,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  errorText: { ...typography.caption, color: colors.text, flex: 1 },
  errorAction: { ...typography.label, color: colors.accent },

  titleBox: { gap: 8 },
  titleLabel: { ...typography.label, color: colors.mutedMid },
  titleInput: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  titleHint: { ...typography.micro, color: colors.mutedMid },

  actions: { gap: 10 },
});
