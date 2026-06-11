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
});

const parsed = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_PROXY_URL: process.env.GEMINI_PROXY_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
});

// Real Supabase auth is always enforced — no bypass. Every /api/mobile/v1/*
// request must carry a valid Supabase JWT (see withMobileAuth).
export const env = parsed;
