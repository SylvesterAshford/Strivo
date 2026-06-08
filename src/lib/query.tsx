"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

// Stale-while-revalidate defaults — design.md 9.4: render from cache, refresh
// in background. 3G baseline means generous stale windows.
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

export function QueryProvider({ children }: { children: ReactNode }) {
  // One client per browser session (kept stable across re-renders).
  const [queryClient] = useState(makeClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
