import { config } from "dotenv";
import type { Config } from "drizzle-kit";

// drizzle-kit doesn't load .env.local automatically (Next.js convention)
config({ path: ".env.local" });

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
