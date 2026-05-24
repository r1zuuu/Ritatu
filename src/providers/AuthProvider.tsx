import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { LocalUser } from "../data/types";

const CREDS = { login: "stas", password: "1234" };
const STORAGE_KEY = "ritatu:auth:loggedIn";

const LOCAL_USER: LocalUser = {
  uid: "stas",
  email: "stas@local",
  displayName: "Stas",
};

type AuthContextValue = {
  user: LocalUser | null;
  loading: boolean;
  error: string | null;
  signIn: (login: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "true") setUser(LOCAL_USER);
      setLoading(false);
    });
  }, []);

  const signIn = useCallback(async (login: string, password: string) => {
    if (login.trim() === CREDS.login && password === CREDS.password) {
      await AsyncStorage.setItem(STORAGE_KEY, "true");
      setError(null);
      setUser(LOCAL_USER);
    } else {
      setError("Nieprawidłowy login lub hasło.");
    }
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, error, signIn, signOut }),
    [user, loading, error, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
