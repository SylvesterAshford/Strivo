"use client";

import type { ReactNode } from "react";
import { QueryProvider } from "@/lib/query";
import { AuthProvider } from "@/contexts/AuthContext";
import { RouterBridge } from "@/rn/router";
import { SafeAreaProvider } from "@/rn";
import { AuthGate } from "./AuthGate";

// Root client providers: react-query → auth → router bridge (so the global
// `router` singleton has a live instance) → the auth/onboarding route guard.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <SafeAreaProvider>
          <RouterBridge />
          <AuthGate>{children}</AuthGate>
        </SafeAreaProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
