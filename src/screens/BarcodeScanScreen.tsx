import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Linking, Pressable, StyleSheet, Text, Vibration, View } from "react-native";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { MacroConfirmSheet } from "../components/MacroConfirmSheet";
import { Screen } from "../components/Screen";
import type { MealDraft } from "../data/types";
import { getDeveloperSettings } from "../data/developerRepository";
import { useMeals } from "../providers/MealsProvider";
import { lookupProductByBarcode, type ProductLookupResult } from "../services/openFoodFactsService";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

type LookupError = Extract<ProductLookupResult, { ok: false }>;

const statusTitle: Record<LookupError["status"], string> = {
  not_found: "Nie znaleziono produktu",
  incomplete: "Brakuje danych makro",
  network_error: "Problem z polaczeniem",
};

export const BarcodeScanScreen = () => {
  const { addMeal } = useMeals();
  const params = useLocalSearchParams<{ section?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState<LookupError | null>(null);
  const [draft, setDraft] = useState<MealDraft | null>(null);
  const [torch, setTorch] = useState(false);
  const scanLockedRef = useRef(false);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading || draft) {
      pulse.stopAnimation();
      return undefined;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [draft, loading, pulse]);

  const resetScan = () => {
    scanLockedRef.current = false;
    setLookupError(null);
    setDraft(null);
    setLoading(false);
  };

  const goManual = (barcode?: string) => {
    router.replace({
      pathname: "/add-meal/manual",
      params: {
        ...(barcode ? { barcode } : {}),
        ...(params.section ? { section: params.section } : {}),
      },
    });
  };

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
    opacity: pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 0.9],
    }),
    transform: [
      {
        scale: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.97, 1],
        }),
      },
    ],
  };

  if (!permission) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.text} />
          <Text style={styles.permissionBody}>Sprawdzam dostep do aparatu.</Text>
        </View>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.permissionTitle}>Aparat jest potrzebny do skanowania kodow.</Text>
          <Text style={styles.permissionBody}>
            Ritatu uzyje aparatu tylko do odczytania kodu kreskowego produktu.
          </Text>
          <Button
            title={permission.canAskAgain ? "Daj dostep" : "Otwórz ustawienia"}
            onPress={() => (permission.canAskAgain ? void requestPermission() : void Linking.openSettings())}
            accessibilityHint="Otwiera prosbe systemowa o dostep do aparatu"
          />
          <Button
            title="Wpisz recznie"
            variant="secondary"
            onPress={() => goManual()}
            accessibilityHint="Przechodzi do recznego wpisania posilku"
          />
        </View>
      </Screen>
    );
  }

  return (
    <View style={styles.wrap}>
      <CameraView
        accessibilityLabel="Skaner kodow kreskowych"
        style={styles.camera}
        facing="back"
        enableTorch={torch}
        onBarcodeScanned={handleScan}
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"],
        }}
      />

      <View pointerEvents="none" style={styles.scrim} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Wróć"
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            onPress={() => router.back()}
          >
            <Icon name="chevron-left" size={20} color={colors.paper} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Skan produktu</Text>
            <Text style={styles.title}>Ustaw kod w ramce</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={torch ? "Wyłącz latarkę" : "Włącz latarkę"}
            style={({ pressed }) => [styles.back, torch && styles.torchOn, pressed && styles.pressed]}
            onPress={() => setTorch((v) => !v)}
          >
            <Icon name={torch ? "flash-on" : "flash-off"} size={20} color={torch ? colors.warmBlack : colors.paper} />
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
          ) : null}

          {lookupError ? (
            <View style={styles.errorBox}>
              <View style={styles.errorTitleRow}>
                <Icon name="alert" size={18} color={colors.danger} />
                <Text style={styles.errorTitle}>{statusTitle[lookupError.status]}</Text>
              </View>
              <Text style={styles.errorText}>{lookupError.warning}</Text>
              <View style={styles.actions}>
                <Button
                  title="Skanuj ponownie"
                  icon="scan"
                  variant="secondary"
                  onPress={resetScan}
                  accessibilityHint="Wraca do aktywnego skanowania"
                />
                <Button
                  title="Wpisz recznie"
                  icon="plus"
                  onPress={() => goManual(lookupError.barcode)}
                  accessibilityHint="Przechodzi do formularza recznego wpisania makro"
                />
              </View>
            </View>
          ) : null}

          {!loading && !lookupError ? (
            <Text style={styles.panelText}>Skaner jest aktywny. Przytrzymaj telefon stabilnie.</Text>
          ) : null}
        </View>
      </View>

      <MacroConfirmSheet
        visible={Boolean(draft)}
        draft={draft}
        onClose={resetScan}
        onConfirm={async (confirmed) => {
          await addMeal(confirmed);
          setDraft(null);
          router.replace("/home");
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.warmBlack,
  },
  camera: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  scrim: {
    backgroundColor: "rgba(7, 6, 4, 0.34)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 56,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  headerText: { flex: 1 },
  torchOn: { backgroundColor: colors.accent },
  eyebrow: {
    color: colors.accentHover,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: colors.paper,
    fontSize: 34,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.paper,
    fontSize: 16,
    fontWeight: "700",
    opacity: 0.82,
  },
  viewfinderWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  viewfinderPulse: {
    position: "absolute",
    width: 250,
    height: 154,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: "rgba(229, 155, 91, 0.08)",
  },
  viewfinder: {
    width: 270,
    height: 174,
    borderRadius: 20,
  },
  corner: {
    position: "absolute",
    width: 42,
    height: 42,
    borderColor: colors.accentHover,
  },
  cornerTopLeft: {
    left: 0,
    top: 0,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderTopLeftRadius: 18,
  },
  cornerTopRight: {
    right: 0,
    top: 0,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderTopRightRadius: 18,
  },
  cornerBottomLeft: {
    left: 0,
    bottom: 0,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderBottomLeftRadius: 18,
  },
  cornerBottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderBottomRightRadius: 18,
  },
  panel: {
    minHeight: 112,
    borderRadius: 16,
    backgroundColor: "rgba(19, 19, 26, 0.92)",
    borderWidth: 1,
    borderColor: colors.borderMid,
    padding: 14,
    justifyContent: "center",
    gap: 12,
  },
  panelText: {
    ...typography.body,
    color: colors.paper,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  errorBox: {
    gap: 10,
  },
  errorTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  errorTitle: {
    ...typography.section,
    color: colors.paper,
  },
  errorText: {
    ...typography.body,
    color: colors.mutedMid,
  },
  actions: {
    gap: 10,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    gap: 14,
  },
  permissionTitle: {
    ...typography.title,
    color: colors.text,
  },
  permissionBody: {
    ...typography.body,
    color: colors.muted,
  },
  back: {
    alignItems: "center",
    backgroundColor: "rgba(19,19,26,0.72)",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    marginTop: 2,
    width: 36,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.96 }],
  },
});
