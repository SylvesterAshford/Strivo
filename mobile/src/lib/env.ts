// Mobile env. Expo exposes EXPO_PUBLIC_* vars to the client bundle.
// Set these in mobile/.env (gitignored). Supabase creds added by the user.

// Placeholder fallbacks keep createClient() from throwing before real creds are
// added, so the UI boots for testing. Auth calls fail gracefully until the user
// fills mobile/.env. isConfigured() gates real auth attempts.
const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "public-anon-placeholder";

function read(key: string, value: string | undefined, fallback: string): string {
  if (!value) console.warn(`[env] ${key} is not set. Add it to mobile/.env`);
  return value ?? fallback;
}

export const env = {
  supabaseUrl: read("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL, PLACEHOLDER_URL),
  supabaseAnonKey: read("EXPO_PUBLIC_SUPABASE_ANON_KEY", process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, PLACEHOLDER_KEY),
  // Base URL of the existing Next.js backend (mobile API routes).
  apiBaseUrl: read("EXPO_PUBLIC_API_BASE_URL", process.env.EXPO_PUBLIC_API_BASE_URL, ""),
  // Skip auth + onboarding entirely. Set EXPO_PUBLIC_AUTH_BYPASS=false in
  // mobile/.env to test the real Supabase phone-OTP flow. Defaults to true
  // for developer convenience; production builds MUST set this to "false".
  authBypass: (process.env.EXPO_PUBLIC_AUTH_BYPASS ?? "true").toLowerCase() !== "false",
};

export function isSupabaseConfigured(): boolean {
  return env.supabaseUrl !== PLACEHOLDER_URL && env.supabaseAnonKey !== PLACEHOLDER_KEY;
}
