import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toDateKey } from "../core/date";
import { deleteProgressPhoto, getProgressPhotos, saveProgressPhotos } from "../data/progressPhotoRepository";
import type { ProgressPhoto, WeightEntry } from "../data/types";
import { getWeights, saveWeights } from "../data/weightRepository";
import { useUserProfile } from "../providers/UserProfileProvider";
import { colors } from "../theme/colors";
import { AddProgressPhotoSheet } from "./home/AddProgressPhotoSheet";
import { AddWeightSheet } from "./home/AddWeightSheet";
import { MeasurementsView } from "./home/MeasurementsView";

export const MeasurementsScreen = () => {
  const { profile } = useUserProfile();
  const insets = useSafeAreaInsets();
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

  const handleAddWeight = async (kg: number) => {
    const entry: WeightEntry = { id: Date.now().toString(36), date: toDateKey(new Date()), weightKg: kg };
    const next = [...weights, entry];
    await saveWeights(next);
    setWeights(next);
    setShowAddWeight(false);
  };

  const handleSavePhoto = async (photo: ProgressPhoto) => {
    const next = [photo, ...photos];
    await saveProgressPhotos(next);
    setPhotos(next);
  };

  const handleDeletePhoto = async (id: string) => {
    setPhotos(await deleteProgressPhoto(id));
  };

  const currentWeight = weights.at(-1)?.weightKg;

  return (
    <View style={[s.wrap, { paddingTop: insets.top }]}>
      <MeasurementsView
        weights={weights}
        profile={profile}
        progressPhotos={photos}
        onAddWeight={() => setShowAddWeight(true)}
        onAddPhoto={() => setShowAddPhoto(true)}
        onDeletePhoto={handleDeletePhoto}
      />

      <AddWeightSheet
        visible={showAddWeight}
        lastWeight={currentWeight}
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
