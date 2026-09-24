import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../components/Toast";
import { toDateKey } from "../core/date";
import { formatDecimal } from "../core/numberFormat";
import { deleteProgressPhoto, getProgressPhotos, saveProgressPhotos } from "../data/progressPhotoRepository";
import type { ProgressPhoto, WeightEntry } from "../data/types";
import { getWeights, saveWeights } from "../data/weightRepository";
import { useUserProfile } from "../providers/UserProfileProvider";
import { colors } from "../theme/colors";
import { AddProgressPhotoSheet } from "./home/AddProgressPhotoSheet";
import { AddWeightSheet } from "./home/AddWeightSheet";
import { MeasurementsView } from "./home/MeasurementsView";

const byDate = (a: WeightEntry, b: WeightEntry) => a.date.localeCompare(b.date);

export const MeasurementsScreen = () => {
  const { profile } = useUserProfile();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [showAddPhoto, setShowAddPhoto] = useState(false);

  // Tabs stay mounted, so reload on focus: the demo seed in Profile rewrites both.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void Promise.all([getWeights(), getProgressPhotos()]).then(([nextWeights, nextPhotos]) => {
        if (!active) return;
        setWeights(nextWeights);
        setPhotos(nextPhotos);
      });
      return () => { active = false; };
    }, []),
  );

  const persist = async (next: WeightEntry[]) => {
    const sorted = [...next].sort(byDate);
    await saveWeights(sorted);
    setWeights(sorted);
  };

  const todayKey = toDateKey(new Date());
  const hasToday = weights.some((w) => w.date === todayKey);

  // One weigh-in per day: a second one replaces the first instead of adding
  // a duplicate point to the chart.
  const handleAddWeight = async (kg: number) => {
    const entry: WeightEntry = { id: Date.now().toString(36), date: todayKey, weightKg: kg };
    await persist([...weights.filter((w) => w.date !== todayKey), entry]);
    setShowAddWeight(false);
    toast({ message: `Zapisano ${formatDecimal(kg, 1)} kg` });
  };

  const handleDeleteWeight = async (entry: WeightEntry) => {
    const before = weights;
    await persist(weights.filter((w) => w.id !== entry.id));
    toast({
      message: `Usunięto pomiar ${formatDecimal(entry.weightKg, 1)} kg`,
      action: { label: "Cofnij", onPress: () => void persist(before) },
    });
  };

  const handleSavePhoto = async (photo: ProgressPhoto) => {
    const next = [photo, ...photos];
    await saveProgressPhotos(next);
    setPhotos(next);
  };

  // A photo file cannot come back after deletion, so this one asks first.
  const handleDeletePhoto = (id: string) =>
    Alert.alert("Usunąć zdjęcie?", "Tej operacji nie można cofnąć.", [
      { text: "Anuluj", style: "cancel" },
      { text: "Usuń", style: "destructive", onPress: () => void deleteProgressPhoto(id).then(setPhotos) },
    ]);

  const currentWeight = weights.at(-1)?.weightKg;

  return (
    <View style={[s.wrap, { paddingTop: insets.top }]}>
      <MeasurementsView
        weights={weights}
        profile={profile}
        progressPhotos={photos}
        onAddWeight={() => setShowAddWeight(true)}
        onDeleteWeight={(entry) => void handleDeleteWeight(entry)}
        onAddPhoto={() => setShowAddPhoto(true)}
        onDeletePhoto={handleDeletePhoto}
      />

      <AddWeightSheet
        visible={showAddWeight}
        lastWeight={currentWeight}
        replacesToday={hasToday}
        onClose={() => setShowAddWeight(false)}
        onSave={handleAddWeight}
      />

      <AddProgressPhotoSheet
        visible={showAddPhoto}
        currentWeight={currentWeight}
        onClose={() => setShowAddPhoto(false)}
        onSave={handleSavePhoto}
      />
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { backgroundColor: colors.background, flex: 1 },
});
