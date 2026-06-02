import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth as useClerkAuth, useUser, useClerk } from "@clerk/react";
import { config } from "../config";
import { setAuthHeadersGetter } from "../lib/api";
import * as guestApi from "../lib/guest";

// ---------------------------------------------------------------------------
// Unified auth: a user is EITHER a Clerk account OR an anonymous guest.
// Both are normalised to { id, fullName, email, isGuest }, and both produce the
// right auth headers for the API client (Clerk Bearer vs guest X-Guest-Id).
// ---------------------------------------------------------------------------
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { isLoaded: clerkLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  const [guest, setGuest] = useState(null); // { id, displayName } | null
  const [bootReady, setBootReady] = useState(false);
  const migratedRef = useRef(false);

  // Keep the latest session info in refs so the (stable) headers getter always
  // reads current values without being re-registered on every change.
  const signedInRef = useRef(false);
  signedInRef.current = !!isSignedIn;
  const guestRef = useRef(null);
  guestRef.current = guest;

  // Register the auth-header provider with the API client once.
  useEffect(() => {
    setAuthHeadersGetter(async () => {
      if (signedInRef.current) {
        const token = await getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      }
      if (guestRef.current) return { "X-Guest-Id": guestRef.current.id };
      return {};
    });
  }, [getToken]);

  // Bootstrap once Clerk has resolved: migrate-or-restore, then mark ready.
  useEffect(() => {
    if (!clerkLoaded) return;
    let alive = true;

    (async () => {
      const storedId = guestApi.getStoredGuestId();

      if (isSignedIn) {
        // A guest who just signed in → migrate their data into the Clerk account.
        if (storedId && !migratedRef.current) {
          migratedRef.current = true;
          // Hold the UI on the boot screen until migration finishes so ChatApp
          // mounts AFTER the chats are re-keyed (and thus loads the migrated set).
          setBootReady(false);
          try {
            const token = await getToken();
            await fetch(`${config.apiUrl}/api/auth/guest/upgrade`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Guest-Id": storedId,
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            });
          } catch {
            /* non-fatal — keep going as the Clerk user */
          }
          guestApi.clearGuestId();
        }
        if (alive) {
          setGuest(null);
          setBootReady(true);
        }
        return;
      }

      // Not signed in with Clerk → restore a guest session if one is stored.
      if (storedId) {
        try {
          const g = await guestApi.restoreGuest(storedId);
          if (alive) setGuest({ id: g.guestId, displayName: g.displayName });
        } catch {
          guestApi.clearGuestId(); // stale/expired id
          if (alive) setGuest(null);
        }
      }
      if (alive) setBootReady(true);
    })();

    return () => {
      alive = false;
    };
  }, [clerkLoaded, isSignedIn, getToken]);

  const continueAsGuest = useCallback(async () => {
    const g = await guestApi.createGuest();
    guestApi.storeGuestId(g.guestId);
    setGuest({ id: g.guestId, displayName: g.displayName });
  }, []);

  const signOut = useCallback(async () => {
    if (guestRef.current && !signedInRef.current) {
      guestApi.clearGuestId();
      setGuest(null);
      return;
    }
    await clerkSignOut();
  }, [clerkSignOut]);

  const isGuest = !isSignedIn && !!guest;
  const user = isSignedIn
    ? {
        id: clerkUser?.id,
        fullName: clerkUser?.fullName || clerkUser?.firstName || "User",
        email: clerkUser?.primaryEmailAddress?.emailAddress || "",
        isGuest: false,
      }
    : guest
    ? { id: guest.id, fullName: guest.displayName || "Guest User", email: "", isGuest: true }
    : null;

  const value = {
    ready: clerkLoaded && bootReady,
    user,
    isGuest,
    isAuthed: !!user,
    continueAsGuest,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAppAuth must be used within AuthProvider");
  return ctx;
}
