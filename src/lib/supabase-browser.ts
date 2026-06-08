"use client";

// Browser Supabase client for Google OAuth + email/password auth. Sessions
// persist in localStorage so they survive reloads, and detectSessionInUrl lets
// Supabase finish the OAuth redirect when the callback lands back on the app.
import { createClient } from "@supabase/supabase-js";
import { clientEnv } from "./client-env";

export const supabase = createClient(clientEnv.supabaseUrl, clientEnv.supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
