import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: false,
    setupFiles: [],
    // @/lib/env validates these at import. Integration tests mock @/db/client
    // (PGlite) and @supabase/supabase-js (token validation); SUPABASE_* must be
    // present so getSupabaseClient() initializes and the mocked getUser runs.
    env: {
      DATABASE_URL: "postgres://test:test@localhost:5432/test",
      GEMINI_API_KEY: "test-key",
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_ANON_KEY: "test-anon-key",
    },
    // PGlite WASM boot + schema load needs more than the 5s default.
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
