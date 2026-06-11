"use client";

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useState, type ReactNode } from "react";

// Stale-while-revalidate defaults — design.md 9.4: render from cache, refresh
// in background. 3G baseline means generous stale windows.
//
// The cache is PERSISTED to localStorage so a page reload paints instantly
// with the last-known data and revalidates quietly — without this, every
// reload was a cold cache and the user sat through the branded splash while
// home/reports refetched from the DB. Auth changes still wipe it: the
// user-change branch in AuthContext calls queryClient.clear(), which the
// persister mirrors to storage.
function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 24 * 60 * 60 * 1000,
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  });
}

// Bump to invalidate every persisted cache after a breaking response-shape
// change (e.g. money-format or API field renames).
const CACHE_BUSTER = "v2-burmese-units";

export function QueryProvider({ children }: { children: ReactNode }) {
  // One client per browser session (kept stable across re-renders).
  const [queryClient] = useState(makeClient);
  const [persister] = useState(() =>
    createSyncStoragePersister({
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      key: "strivo-query-cache",
    })
  );
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000, buster: CACHE_BUSTER }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
