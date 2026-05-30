import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { syncWorkspace, fetchHome, fetchProfile } from "@/lib/api";
import { useProfile, type BusinessType } from "@/stores/profile";
import { useOnboarding } from "@/stores/onboarding";

// Coerce the backend's free-form businessType string into the local enum.
function toBusinessType(raw: string | null): BusinessType | null {
  switch (raw) {
    case "retail":
    case "fnb":
    case "services":
    case "b2b_trading":
    case "other":
      return raw;
    default:
      return raw ? "other" : null;
  }
}

interface AuthState {
  session: Session | null;
  initializing: boolean;
  // True while we resolve the backend workspace right after sign-in. The
  // root navigator waits on this so a returning/seeded user never flashes
  // into the onboarding wizard before we know they're already set up.
  syncing: boolean;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithEmailPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signInAnonymously: () => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

// Parse the Supabase OAuth callback URL. Supabase returns the session in the
// fragment (#access_token=...) when the redirect lands in the app.
function extractTokens(url: string): { access_token: string; refresh_token: string } | null {
  const fragment = url.split("#")[1];
  if (!fragment) return null;
  const params = new URLSearchParams(fragment);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();
  // Track the user ID whose session has already been hydrated so the
  // INITIAL_SESSION event doesn't reset a profile we just loaded.
  const hydratedForRef = useRef<string | null>(null);
  const lastUserId = useRef<string | null>(null);

  // Resolve the backend workspace and mirror its onboarding state into the
  // local profile store. Called after sign-in and on cold start.
  const hydrateFromBackend = useCallback(async (userId: string) => {
    try {
      const ws = await syncWorkspace();
      if (ws) {
        const profile = useProfile.getState();
        if (ws.name) profile.setBusinessName(ws.name);
        const bt = toBusinessType(ws.businessType);
        if (bt) profile.setBusinessType(bt);
        // If the server says onboarded=true, mark it.
        // If the server is unreachable (ws=null falls through), treat an
        // authenticated user as onboarded so they aren't stuck on the
        // wizard — the ProfileNudge on Home will prompt for missing data.
        if (ws.onboarded) {
          profile.completeOnboarding();
        }
      } else {
        // Backend unreachable — assume the user was previously onboarded
        // rather than trapping them in the wizard with no server to sync to.
        useProfile.getState().completeOnboarding();
      }
      hydratedForRef.current = userId;

      // Prefetch the two most-used queries so the Home and Profile tabs
      // render with real data the moment the loading screen clears.
      await Promise.all([
        queryClient.prefetchQuery({ queryKey: ["home"], queryFn: fetchHome, staleTime: 30_000 }),
        queryClient.prefetchQuery({ queryKey: ["profile"], queryFn: fetchProfile, staleTime: 60_000 }),
      ]).catch(() => {
        // Prefetch failures are non-fatal — the tabs will refetch themselves.
      });
    } catch (err) {
      console.warn("[auth] workspace hydrate failed:", err);
      useProfile.getState().completeOnboarding();
      hydratedForRef.current = userId;
    } finally {
      setSyncing(false);
    }
  }, [queryClient]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null;
      setSession(data.session);
      lastUserId.current = uid;
      if (data.session && uid) {
        setSyncing(true);
        void hydrateFromBackend(uid);
      }
      setInitializing(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      const prevId = lastUserId.current;
      const nextId = next?.user.id ?? null;

      // Only clear stores when the *user* genuinely changes (a different
      // account signed in, or the session was revoked). Skip if:
      //  - same user (prevId === nextId): nothing changed.
      //  - INITIAL_SESSION with a user we already hydrated: Supabase fires
      //    this on every cold start; resetting here would wipe the profile
      //    we just loaded from the backend.
      const isSameUser = prevId === nextId;
      const isAlreadyHydrated =
        event === "INITIAL_SESSION" && nextId !== null && hydratedForRef.current === nextId;

      if (!isSameUser && !isAlreadyHydrated) {
        queryClient.clear();
        useProfile.getState().reset();
        useOnboarding.getState().reset();
      }

      lastUserId.current = nextId;
      setSession(next);

      // Only kick off hydration for an explicit sign-in (new session from
      // the login screen), not for INITIAL_SESSION (already handled by
      // getSession() above).
      if (event === "SIGNED_IN" && nextId) {
        setSyncing(true);
        void hydrateFromBackend(nextId);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient, hydrateFromBackend]);

  const signInWithGoogle = async (): Promise<{ error: string | null }> => {
    // Build the redirect URL into the app (lattice://auth-callback in dev/prod builds,
    // exp://...:8081/--/auth-callback inside Expo Go).
    const redirectTo = Linking.createURL("auth-callback");
    console.log("[auth] OAuth redirectTo:", redirectTo);

    // Ask Supabase for the Google OAuth consent URL — don't auto-open in browser;
    // we open it ourselves via expo-web-browser so the redirect comes back to the app.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) return { error: error.message };
    if (!data?.url) return { error: "Supabase did not return an OAuth URL" };

    console.log("[auth] Opening Supabase OAuth URL:", data.url);
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    console.log("[auth] WebBrowser result:", JSON.stringify(result));
    if (result.type !== "success" || !result.url) {
      return { error: result.type === "cancel" ? null : `Google sign-in failed (${result.type})` };
    }

    const tokens = extractTokens(result.url);
    if (!tokens) return { error: "No session tokens in OAuth callback" };

    const { error: setErr } = await supabase.auth.setSession(tokens);
    return { error: setErr?.message ?? null };
  };

  const signInWithEmailPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signInAnonymously = async () => {
    const { error } = await supabase.auth.signInAnonymously();
    return { error: error?.message ?? null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, initializing, syncing, signInWithGoogle, signInWithEmailPassword, signInAnonymously, resetPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
