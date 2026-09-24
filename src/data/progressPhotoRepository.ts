import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import type { ProgressPhoto } from "./types";

const PROGRESS_PHOTOS_KEY = "ritatu:progress-photos";

const photosDir = () => new Directory(Paths.document, "progress-photos");

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

// The picker returns a cache path the OS may clear at any time, which made
// progress photos disappear. Keep a copy in the app's documents instead.
export const persistProgressPhotoFile = async (sourceUri: string, id: string): Promise<string> => {
  if (Platform.OS === "web") return sourceUri;
  const dir = photosDir();
  dir.create({ intermediates: true, idempotent: true });
  const ext = sourceUri.split("?")[0].split(".").pop() || "jpg";
  const target = new File(dir, `${id}.${ext}`);
  await new File(sourceUri).copy(target);
  return target.uri;
};

// Only files we copied are ours to delete; older entries point at the picker cache.
const deleteOwnedFile = (uri: string) => {
  if (Platform.OS === "web" || !uri.startsWith(photosDir().uri)) return;
  try { new File(uri).delete(); } catch { /* already gone */ }
};

export const deleteProgressPhoto = async (id: string): Promise<ProgressPhoto[]> => {
  const all = await getProgressPhotos();
  const removed = all.find((p) => p.id === id);
  const next = all.filter((p) => p.id !== id);
  await saveProgressPhotos(next);
  if (removed) deleteOwnedFile(removed.uri);
  return next;
};

export const clearProgressPhotos = async (): Promise<void> => {
  await AsyncStorage.removeItem(PROGRESS_PHOTOS_KEY);
  if (Platform.OS === "web") return;
  try { photosDir().delete(); } catch { /* nothing stored yet */ }
};

export { PROGRESS_PHOTOS_KEY };
