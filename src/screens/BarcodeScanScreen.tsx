import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { MacroConfirmSheet } from "../components/MacroConfirmSheet";
import { Screen } from "../components/Screen";
import type { MealDraft } from "../data/types";
import { useMeals } from "../providers/MealsProvider";
import { lookupProductByBarcode, type ProductLookupResult } from "../services/openFoodFactsService";
import { colors } from "../theme/colors";

type LookupError = Extract<ProductLookupResult, { ok: false }>;

const statusTitle: Record<LookupError["status"], string> = {
  not_found: "Nie znaleziono produktu",
  incomplete: "Brakuje danych makro",
  network_error: "Problem z polaczeniem",
};

export const BarcodeScanScreen = () => {
  const { addMeal } = useMeals();
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState<LookupError | null>(null);
  const [draft, setDraft] = useState<MealDraft | null>(null);
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
      params: barcode ? { barcode } : undefined,
    });
  };

  const handleScan = async ({ data }: BarcodeScanningResult) => {
    if (scanLockedRef.current || loading || draft) return;

    scanLockedRef.current = true;
    setLookupError(null);
    setLoading(true);

    const result = await lookupProductByBarcode(data);

    if (result.ok) {
      setDraft(result.draft);
    } else {
      setLookupError(result);
    }

    setLoading(false);
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
            title="Daj dostep"
            onPress={() => void requestPermission()}
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
        onBarcodeScanned={handleScan}
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"],
        }}
      />

      <View pointerEvents="none" style={styles.scrim} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Skan produktu</Text>
          <Text style={styles.title}>Ustaw kod w ramce</Text>
          <Text style={styles.subtitle}>Po skanie sprawdze makro w Open Food Facts.</Text>
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
              <Text style={styles.errorTitle}>{statusTitle[lookupError.status]}</Text>
              <Text style={styles.errorText}>{lookupError.warning}</Text>
              <View style={styles.actions}>
                <Button
                  title="Skanuj ponownie"
                  variant="secondary"
                  onPress={resetScan}
                  accessibilityHint="Wraca do aktywnego skanowania"
                />
                <Button
                  title="Wpisz recznie"
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
    paddingTop: 64,
  },
  header: {
    gap: 8,
  },
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
    backgroundColor: colors.paper,
    padding: 14,
    justifyContent: "center",
    gap: 12,
  },
  panelText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  errorBox: {
    gap: 10,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  errorText: {
    color: colors.muted,
    fontWeight: "800",
    lineHeight: 21,
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
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
  },
  permissionBody: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 23,
  },
});
