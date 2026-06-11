// Server observability. Initializes Sentry once per server instance when
// SENTRY_DSN is set; without the env var the whole pipeline is a no-op.
// onRequestError catches every uncaught route/render error (including
// withMobileAuth failures, which deliberately bubble) — explicit
// captureError() calls add workspace tags where we know them.

import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";

export function register(): void {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    // Errors only — no performance tracing, keeps the free tier roomy.
    tracesSampleRate: 0,
    // Privacy: never attach request bodies (ledger rows, amounts) to events.
    sendDefaultPii: false,
  });
}

export const onRequestError: Instrumentation.onRequestError = (...args) =>
  Sentry.captureRequestError(...args);
