import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { syncWorkspace } from "@/lib/api";

interface AuthState {
  session: Session | null;
  initializing: boolean;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithEmailPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signInAnonymously: () => Promise<{ error: string | null }>;
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitializing(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "SIGNED_IN") void syncWorkspace();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<{ error: string | null }> => {
    // Build the redirect URL into the app (lattice://auth-callback).
    const redirectTo = Linking.createURL("auth-callback");

    // Ask Supabase for the Google OAuth consent URL — don't auto-open in browser;
    // we open it ourselves via expo-web-browser so the redirect comes back to the app.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) return { error: error.message };
    if (!data?.url) return { error: "Supabase did not return an OAuth URL" };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success" || !result.url) {
      return { error: result.type === "cancel" ? null : "Google sign-in failed" };
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

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, initializing, signInWithGoogle, signInWithEmailPassword, signInAnonymously, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
