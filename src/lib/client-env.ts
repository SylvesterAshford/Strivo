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
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY,
  // The web app is served from the same origin as its API, so calls use
  // relative paths ("" base).
  apiBaseUrl: "",
  // Skip auth + onboarding entirely for local development. Mirrors the server
  // gate in src/lib/env.ts: explicit "true"/"false" wins; otherwise default to
  // true in development and false in production. A prod build with the var unset
  // therefore enforces real auth instead of silently bypassing the login gate
  // (which would load the app while the server 401s every API call).
  authBypass: clientAuthBypass(),
};

function clientAuthBypass(): boolean {
  const explicit = process.env.NEXT_PUBLIC_AUTH_BYPASS?.toLowerCase();
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export function isSupabaseConfigured(): boolean {
  return clientEnv.supabaseUrl !== PLACEHOLDER_URL && clientEnv.supabaseAnonKey !== PLACEHOLDER_KEY;
}
