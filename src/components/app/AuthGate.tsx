"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/stores/profile";
import { clientEnv, isSupabaseConfigured } from "@/lib/client-env";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { decideRedirect } from "./auth-gate-logic";
import { my } from "@/i18n/my";

// Client-side route guard — the web equivalent of the expo-router root
// navigator. The redirect matrix lives in the pure decideRedirect() helper
// (unit-tested); this component just feeds it live state and acts on the result.
export function AuthGate({ children }: { children: ReactNode }) {
  const { session, initializing, syncing } = useAuth();
  const onboarded = useProfile((s) => s.onboarded);
  const pathname = usePathname() || "/";
  const router = useRouter();

  // Compute the redirect target (null = stay) once auth has resolved.
  const target =
    initializing || syncing
      ? null
      : decideRedirect({
          bypass: clientEnv.authBypass,
          configured: isSupabaseConfigured(),
          hasSession: !!session,
          onboarded,
          pathname,
        });

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  // Branded loading screen while resolving auth + prefetching tab data, or
  // while a redirect is in flight (so we never flash the wrong screen).
  if (initializing || syncing) return <LoadingScreen message={my.greeting ? "ဒေတာ ဆွဲယူနေသည်..." : undefined} />;
  if (target) return <LoadingScreen />;

  return <>{children}</>;
}
