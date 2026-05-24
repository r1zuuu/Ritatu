import type { User } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { db } from "../services/firebase";
import { profileFromDoc, profileToDoc } from "./serializers";
import type { UserProfile } from "./types";

const ensureDb = () => {
  if (!db) throw new Error("Firebase nie jest skonfigurowany.");
  return db;
};

export const createBaseProfile = (user: User): UserProfile => ({
  uid: user.uid,
  email: user.email ?? "",
  displayName: user.displayName,
  onboardingDone: false,
});

export const getUserProfile = async (uid: string) => {
  const ref = doc(ensureDb(), "users", uid);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? profileFromDoc(snapshot.data()) : null;
};

export const upsertUserProfile = async (profile: UserProfile) => {
  const ref = doc(ensureDb(), "users", profile.uid);
  await setDoc(ref, profileToDoc(profile), { merge: true });
};

export const watchUserProfile = (
  uid: string,
  onChange: (profile: UserProfile | null) => void,
  onError: (error: Error) => void,
): Unsubscribe => {
  const ref = doc(ensureDb(), "users", uid);
  return onSnapshot(
    ref,
    (snapshot) => onChange(snapshot.exists() ? profileFromDoc(snapshot.data()) : null),
    onError,
  );
};
