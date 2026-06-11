// Server-side error reporting. Sentry is initialized in src/instrumentation.ts
// only when SENTRY_DSN is set — without it every call here is a cheap no-op,
// so local dev and tests need no configuration.
//
// PRIVACY: tag with identifiers only (route, workspace id, provider). Never
// attach business data — no amounts, descriptions, counterparties, or prompt
// content. The same isolation discipline RLS enforces on rows applies to
// telemetry.

import * as Sentry from "@sentry/nextjs";

export interface ErrorTags {
  route?: string;
  workspaceId?: string;
  /** Subsystem that produced the error, e.g. "llm", "auth", "import". */
  source?: string;
  /** Extra low-cardinality tags (provider name, error kind, …). */
  [key: string]: string | undefined;
}

export function captureError(err: unknown, tags: ErrorTags = {}): void {
  Sentry.withScope((scope) => {
    for (const [key, value] of Object.entries(tags)) {
      if (value) scope.setTag(key, value);
    }
    Sentry.captureException(err);
  });
}
