// Pure decision function for the client route guard (see AuthGate.tsx). Kept
// free of React/Next so it can be unit-tested directly — the redirect matrix
// (unauthenticated / not-onboarded / authed) is exactly the kind of branching
// logic that's easy to get subtly wrong and worth covering. No bypass: real
// Supabase auth is always enforced.

export interface GateState {
  /** Supabase creds present (real auth enforced). */
  configured: boolean;
  /** A live Supabase session exists. */
  hasSession: boolean;
  /** Backend says the workspace has profile data. */
  onboarded: boolean;
  /** Current pathname. */
  pathname: string;
}

const PUBLIC_PREFIXES = ["/login"];
const ONBOARDING_PREFIX = "/onboarding";

/**
 * Returns the path to redirect to, or null to stay. Mirrors the expo-router
 * root navigator: configured-without-session goes to login; authed-not-onboarded
 * goes to the wizard; authed-and-onboarded is kept out of login/onboarding.
 * (When Supabase is unconfigured, everyone is treated as authed — a build-time
 * misconfiguration, not a runtime bypass.)
 */
export function decideRedirect(s: GateState): string | null {
  const isPublic = PUBLIC_PREFIXES.some((p) => s.pathname.startsWith(p));
  const isOnboarding = s.pathname.startsWith(ONBOARDING_PREFIX);

  const authed = s.configured ? s.hasSession : true;

  if (s.configured && !s.hasSession) {
    return isPublic ? null : "/login";
  }
  if (authed && !s.onboarded) {
    return isOnboarding ? null : "/onboarding";
  }
  // authed && onboarded
  return isPublic || isOnboarding ? "/" : null;
}
