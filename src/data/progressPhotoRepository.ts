import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ProgressPhoto } from "./types";

const PROGRESS_PHOTOS_KEY = "ritatu:progress-photos";

const parsePhotos = (value: string | null): ProgressPhoto[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as Array<Omit<ProgressPhoto, "createdAt"> & { createdAt: string }>;
    return parsed.map((photo) => ({ ...photo, createdAt: new Date(photo.createdAt) }));
  } catch {
    return [];
  }
};

export const getProgressPhotos = async (): Promise<ProgressPhoto[]> =>
  parsePhotos(await AsyncStorage.getItem(PROGRESS_PHOTOS_KEY));

export const saveProgressPhotos = async (photos: ProgressPhoto[]): Promise<void> => {
  await AsyncStorage.setItem(PROGRESS_PHOTOS_KEY, JSON.stringify(photos));
};

export const persistProgressPhotoFile = async (sourceUri: string): Promise<string> => sourceUri;

export const deleteProgressPhoto = async (id: string): Promise<ProgressPhoto[]> => {
  const all = await getProgressPhotos();
  const next = all.filter((p) => p.id !== id);
  await saveProgressPhotos(next);
  return next;
};

export const clearProgressPhotos = async (): Promise<void> => {
  await AsyncStorage.removeItem(PROGRESS_PHOTOS_KEY);
};

export { PROGRESS_PHOTOS_KEY };
