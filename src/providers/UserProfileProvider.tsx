import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  createBaseProfile,
  upsertUserProfile,
  watchUserProfile,
} from "../data/userRepository";
import type { UserProfile } from "../data/types";
import { useAuth } from "./AuthProvider";

type UserProfileContextValue = {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  saveProfile: (profile: UserProfile) => Promise<void>;
};

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export const UserProfileProvider = ({ children }: PropsWithChildren) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    return watchUserProfile(
      user.uid,
      async (nextProfile) => {
        if (nextProfile) {
          setProfile(nextProfile);
          setLoading(false);
          return;
        }

        const baseProfile = createBaseProfile(user);
        await upsertUserProfile(baseProfile);
        setProfile(baseProfile);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, [user]);

  const saveProfile = useCallback(async (next: UserProfile) => {
    await upsertUserProfile(next);
    setProfile(next);
  }, []);

  const value = useMemo(
    () => ({ profile, loading, error, saveProfile }),
    [error, loading, profile, saveProfile],
  );

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) throw new Error("useUserProfile must be used inside UserProfileProvider");
  return context;
};
