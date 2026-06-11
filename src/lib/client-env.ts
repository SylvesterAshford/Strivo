// Browser-side env for the web frontend. Next exposes NEXT_PUBLIC_* vars to the
// client bundle. (The server-only env with the zod schema lives in `./env`.)
//
// Placeholder fallbacks keep createClient() from throwing before real creds are
// added, so the UI boots for testing. Auth calls fail gracefully until the user
// fills .env.local. isSupabaseConfigured() gates real auth attempts.
const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "public-anon-placeholder";

export const clientEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL,
  // Supabase renamed the client key "anon" → "publishable" (sb_publishable_…).
  // Prefer the new name, fall back to the legacy one, then the placeholder.
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    PLACEHOLDER_KEY,
  // The web app is served from the same origin as its API, so calls use
  // relative paths ("" base).
  apiBaseUrl: "",
};

export function isSupabaseConfigured(): boolean {
  return clientEnv.supabaseUrl !== PLACEHOLDER_URL && clientEnv.supabaseAnonKey !== PLACEHOLDER_KEY;
}
