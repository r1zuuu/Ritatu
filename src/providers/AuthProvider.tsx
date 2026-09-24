import type { LocalUser } from "../data/types";

// Local, single-user app: there is no sign-in. Every storage key hangs off this
// uid, so it must never change or existing data disappears.
const LOCAL_USER: LocalUser = {
  uid: "user",
  email: "user@local",
  displayName: "User",
};

export const useAuth = () => ({ user: LOCAL_USER });
