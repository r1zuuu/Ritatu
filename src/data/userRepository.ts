import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LocalUser, UserProfile } from "./types";

const PROFILE_KEY = "ritatu:profile";

export const createBaseProfile = (user: LocalUser): UserProfile => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
  onboardingDone: false,
});

const parseProfile = (val: string | null): UserProfile | null => {
  if (!val) return null;
  try {
    const data = JSON.parse(val) as UserProfile & { targetDate?: string | null };
    return { ...data, targetDate: data.targetDate ? new Date(data.targetDate) : null };
  } catch {
    return null;
  }
};

export const getUserProfile = async (): Promise<UserProfile | null> =>
  parseProfile(await AsyncStorage.getItem(PROFILE_KEY));

export const upsertUserProfile = async (profile: UserProfile): Promise<void> => {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

export const watchUserProfile = (
  _uid: string,
  onChange: (profile: UserProfile | null) => void,
  onError: (error: Error) => void,
): (() => void) => {
  getUserProfile().then(onChange).catch(onError);
  return () => {};
};
