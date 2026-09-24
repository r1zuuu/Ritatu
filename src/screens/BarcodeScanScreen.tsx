import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Linking, Pressable, StyleSheet, Text, Vibration, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { MacroConfirmSheet } from "../components/MacroConfirmSheet";
import { Screen } from "../components/Screen";
import { formatDayLabel } from "../core/date";
import { getSectionByTime } from "../core/section";
import type { MealDraft } from "../data/types";
import { getDeveloperSettings } from "../data/developerRepository";
import { useMeals } from "../providers/MealsProvider";
import { lookupProductByBarcode, type ProductLookupResult } from "../services/openFoodFactsService";
import { colors } from "../theme/colors";
import { radius, space } from "../theme/layout";
import { typography } from "../theme/typography";

type LookupError = Extract<ProductLookupResult, { ok: false }>;

const statusTitle: Record<LookupError["status"], string> = {
  not_found: "Nie znaleziono produktu",
  incomplete: "Brakuje wartości odżywczych",
  network_error: "Problem z połączeniem",
};

// After the result sheet closes the same code is usually still in frame;
// without a pause it is scanned again and the sheet pops straight back.
const RESCAN_COOLDOWN_MS = 1500;

export const BarcodeScanScreen = () => {
  const { addMeal, dateOffset, selectedDate } = useMeals();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ section?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState<LookupError | null>(null);
  const [draft, setDraft] = useState<MealDraft | null>(null);
  const [torch, setTorch] = useState(false);
  const scanLockedRef = useRef(false);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { if (cooldownRef.current) clearTimeout(cooldownRef.current); }, []);

  useEffect(() => {
    if (loading || draft) {
      pulse.stopAnimation();
      return undefined;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [draft, loading, pulse]);

  const resetScan = () => {
    setLookupError(null);
    setDraft(null);
    setLoading(false);
    if (cooldownRef.current) clearTimeout(cooldownRef.current);
    cooldownRef.current = setTimeout(() => { scanLockedRef.current = false; }, RESCAN_COOLDOWN_MS);
  };

  // Back to the diary with the search sheet open for the same meal.
  const goSearch = () =>
    router.dismissTo({ pathname: "/home", params: { add: params.section ?? getSectionByTime() } });

  const handleScan = async ({ data }: BarcodeScanningResult) => {
    if (scanLockedRef.current) return;
    scanLockedRef.current = true;

    setLookupError(null);
    setLoading(true);

    try {
      const settings = await getDeveloperSettings();
      if (settings.mockBarcodeEnabled) {
        Vibration.vibrate(40);
        setDraft({
          name: "Produkt testowy",
          weightG: 100,
          proteinPer100g: 12,
          carbsPer100g: 18,
          fatPer100g: 4,
          source: "barcode",
          barcode: data,
          section: params.section ?? null,
          note: "Wynik mock z panelu developerskiego.",
        });
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      try {
        const result = await lookupProductByBarcode(data, controller.signal);
        if (result.ok) {
          Vibration.vibrate(40);
          setDraft({ ...result.draft, section: params.section ?? null });
        } else {
          // Stay locked so the live camera doesn't re-scan the same code in a
          // loop; the error panel's "Skanuj ponownie" releases it via resetScan.
          Vibration.vibrate([0, 40, 80, 40]);
          setLookupError(result);
        }
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      Vibration.vibrate([0, 40, 80, 40]);
      setLookupError({
        ok: false,
        status: "network_error",
        barcode: data,
        warning: "Nie udało się pobrać danych. Spróbuj ponownie.",
      });
    } finally {
      setLoading(false);
    }
  };

  const pulseStyle = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }],
  };

  const backButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Wróć"
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
      onPress={() => router.back()}
    >
      <Icon name="chevron-left" size={22} color={colors.text} />
    </Pressable>
  );

  if (!permission) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.permissionBody}>Sprawdzam dostęp do aparatu...</Text>
        </View>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        {backButton}
        <View style={styles.center}>
          <View style={styles.permissionIcon}>
            <Icon name="barcode" size={30} color={colors.accent} />
          </View>
          <Text style={styles.permissionTitle}>Aparat jest potrzebny do skanowania kodów</Text>
          <Text style={styles.permissionBody}>
            Ritatu używa aparatu tylko do odczytania kodu kreskowego z opakowania.
          </Text>
          <Button
            title={permission.canAskAgain ? "Zezwól na dostęp" : "Otwórz ustawienia"}
            icon="camera"
            onPress={() => (permission.canAskAgain ? void requestPermission() : void Linking.openSettings())}
          />
          <Button title="Wyszukaj po nazwie" icon="search" variant="secondary" onPress={goSearch} />
        </View>
      </Screen>
    );
  }

  return (
    <View style={styles.wrap}>
      <CameraView
        accessibilityLabel="Skaner kodów kreskowych"
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        onBarcodeScanned={handleScan}
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"] }}
      />

      <View style={styles.scrim} />

      <View style={[styles.content, { paddingBottom: insets.bottom + 24, paddingTop: insets.top + 12 }]}>
        <View style={styles.header}>
          {backButton}
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              Skan produktu{dateOffset !== 0 ? ` · ${formatDayLabel(dateOffset, selectedDate)}` : ""}
            </Text>
            <Text style={styles.title}>Ustaw kod w ramce</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={torch ? "Wyłącz latarkę" : "Włącz latarkę"}
            style={({ pressed }) => [styles.iconButton, torch && styles.torchOn, pressed && styles.pressed]}
            onPress={() => setTorch((v) => !v)}
          >
            <Icon name={torch ? "flash-on" : "flash-off"} size={20} color={torch ? colors.warmBlack : colors.text} />
          </Pressable>
        </View>

        <View style={styles.viewfinderWrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Animated.View style={[styles.viewfinderPulse, pulseStyle]} />
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
        </View>

        <View style={styles.panel} accessibilityLiveRegion="polite">
          {loading ? (
            <View style={styles.statusRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.panelText}>Sprawdzam produkt...</Text>
            </View>
          ) : lookupError ? (
            <View style={styles.errorBox}>
              <View style={styles.errorTitleRow}>
                <Icon name="alert" size={18} color={colors.danger} />
                <Text style={styles.errorTitle}>{statusTitle[lookupError.status]}</Text>
              </View>
              <Text style={styles.errorText}>{lookupError.warning}</Text>
              <View style={styles.actions}>
                <Button title="Skanuj ponownie" icon="scan" variant="secondary" onPress={resetScan} />
                <Button title="Wyszukaj po nazwie" icon="search" onPress={goSearch} />
              </View>
            </View>
          ) : (
            <Text style={styles.panelText}>Skaner jest aktywny. Trzymaj telefon stabilnie, 15–20 cm od kodu.</Text>
          )}
        </View>
      </View>

      <MacroConfirmSheet
        visible={Boolean(draft)}
        draft={draft}
        onClose={resetScan}
        onConfirm={async (confirmed) => {
          await addMeal(confirmed);
          setDraft(null);
          router.back();
        }}
      />
    </View>
  );
};

const CORNER = 40;

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.background, flex: 1 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(8,7,5,0.35)" },
  content: { flex: 1, justifyContent: "space-between", paddingHorizontal: space.xl },
  header: { alignItems: "center", flexDirection: "row", gap: 12 },
  headerText: { flex: 1 },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.scrim,
    borderColor: colors.borderMid,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  torchOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  pressed: { opacity: 0.86, transform: [{ scale: 0.96 }] },
  eyebrow: { ...typography.stat, color: colors.accentHover },
  title: { ...typography.headline, color: colors.text },

  viewfinderWrap: { alignItems: "center", justifyContent: "center" },
  viewfinderPulse: {
    backgroundColor: colors.accentA,
    borderColor: colors.accent,
    borderRadius: 18,
    borderWidth: 1,
    height: 154,
    position: "absolute",
    width: 250,
  },
  viewfinder: { borderRadius: 20, height: 174, width: 270 },
  corner: { borderColor: colors.accentHover, height: CORNER, position: "absolute", width: CORNER },
  cornerTopLeft: { borderLeftWidth: 4, borderTopLeftRadius: 18, borderTopWidth: 4, left: 0, top: 0 },
  cornerTopRight: { borderRightWidth: 4, borderTopRightRadius: 18, borderTopWidth: 4, right: 0, top: 0 },
  cornerBottomLeft: { borderBottomLeftRadius: 18, borderBottomWidth: 4, borderLeftWidth: 4, bottom: 0, left: 0 },
  cornerBottomRight: { borderBottomRightRadius: 18, borderBottomWidth: 4, borderRightWidth: 4, bottom: 0, right: 0 },

  panel: {
    backgroundColor: "rgba(24,20,16,0.94)",
    borderColor: colors.borderMid,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 12,
    justifyContent: "center",
    minHeight: 96,
    padding: space.lg,
  },
  panelText: { ...typography.body, color: colors.text },
  statusRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  errorBox: { gap: 10 },
  errorTitleRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  errorTitle: { ...typography.section, color: colors.text },
  errorText: { ...typography.caption, color: colors.mutedMid },
  actions: { gap: 10 },

  center: { flex: 1, gap: 14, justifyContent: "center" },
  permissionIcon: {
    alignItems: "center",
    backgroundColor: colors.accentA,
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    marginBottom: 4,
    width: 64,
  },
  permissionTitle: { ...typography.headline, color: colors.text },
  permissionBody: { ...typography.body, color: colors.mutedMid, marginBottom: 8 },
});
