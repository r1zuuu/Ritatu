import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  type Auth,
} from "firebase/auth";
// Firebase v12 exposes this in the React Native bundle, but the default TS
// declarations can miss the conditional export.
// @ts-expect-error React Native conditional export is available at runtime.
import { getReactNativePersistence } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { env, isFirebaseConfigured } from "../config/env";

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (isFirebaseConfigured) {
  app = getApps().length > 0 ? getApp() : initializeApp(env.firebase);

  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch {
    authInstance = getAuth(app);
  }

  dbInstance = getFirestore(app);
}

export const firebaseApp = app;
export const auth = authInstance;
export const db = dbInstance;
