import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";
import { env, isFirebaseConfigured, isGoogleAuthConfigured } from "../config/env";
import { auth } from "../services/firebase";

WebBrowser.maybeCompleteAuthSession();

const androidRedirectUri = "com.ritatu.app:/oauthredirect";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [, response, promptAsync] = Google.useAuthRequest({
    webClientId: env.googleWebClientId || undefined,
    iosClientId: env.googleIosClientId || undefined,
    androidClientId: env.googleAndroidClientId || env.googleWebClientId || "missing-android-client-id",
    redirectUri: Platform.OS === "android" ? androidRedirectUri : undefined,
    scopes: ["openid", "profile", "email"],
  });

  const isGoogleConfiguredForPlatform =
    Platform.OS === "android" ? Boolean(env.googleAndroidClientId) : isGoogleAuthConfigured;

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!auth || response?.type !== "success") return;
      const idToken = response.authentication?.idToken;
      if (!idToken) {
        setError("Google nie zwróciło tokenu logowania.");
        return;
      }

      try {
        setError(null);
        setLoading(true);
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nie udało się zalogować.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [response]);

  const signInWithGoogle = useCallback(async () => {
    if (!auth || !isFirebaseConfigured || !isGoogleConfiguredForPlatform) {
      setError(
        Platform.OS === "android"
          ? "Skonfiguruj EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID dla Androida."
          : "Skonfiguruj Firebase oraz EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.",
      );
      return;
    }

    setError(null);
    await promptAsync();
  }, [isGoogleConfiguredForPlatform, promptAsync]);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      isConfigured: Boolean(auth && isFirebaseConfigured && isGoogleConfiguredForPlatform),
      signInWithGoogle,
      signOut,
    }),
    [error, loading, signInWithGoogle, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
