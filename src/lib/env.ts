import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  GEMINI_API_KEY: z.string().min(1),
  // Optional Gemini proxy (Supabase Edge Function) for environments that
  // can't reach Google's API directly. Example:
  // https://<project>.supabase.co/functions/v1/gemini-proxy
  GEMINI_PROXY_URL: z.string().url().optional(),
  // Mobile auth bridge: validate Supabase JWTs from the Expo app.
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  // Skip Supabase JWT validation on /api/mobile/v1/* and return a stub
  // dev user. Defaults to true in development. Production should set
  // AUTH_BYPASS=false explicitly.
  AUTH_BYPASS: z.string().optional(),
});

const parsed = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_PROXY_URL: process.env.GEMINI_PROXY_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  AUTH_BYPASS: process.env.AUTH_BYPASS,
});

// authBypass is true unless explicitly set to "false". In production
// (NODE_ENV=production), it defaults to false for safety.
const explicitBypass = parsed.AUTH_BYPASS?.toLowerCase();
const bypassDefault = process.env.NODE_ENV !== "production";
export const env = {
  ...parsed,
  authBypass:
    explicitBypass === "true" ? true : explicitBypass === "false" ? false : bypassDefault,
};
