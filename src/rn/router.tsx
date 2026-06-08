"use client";

// expo-router → next/navigation shim.
//
// The mobile app navigated with expo-router (`useRouter`, the global `router`
// singleton, `<Link>`, `useLocalSearchParams`, `useFocusEffect`). We back all of
// it with the Next.js App Router so the ported screens keep calling the same API.

import NextLink from "next/link";
import {
  useRouter as useNextRouter,
  usePathname as useNextPathname,
  useSearchParams,
  useParams,
} from "next/navigation";
import { useEffect, useMemo, type ReactNode } from "react";

type Href = string | { pathname: string; params?: Record<string, string | number | undefined> };

function hrefToUrl(href: Href): string {
  if (typeof href === "string") return href;
  const { pathname, params } = href;
  if (!params) return pathname;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${pathname}?${s}` : pathname;
}

// ── Global router singleton ───────────────────────────────────────────────────
// expo exports `router` usable from anywhere (event handlers, modules). We keep
// a module-level reference to the live Next router, registered by <RouterBridge>
// mounted in the root layout. Falls back to location for early/SSR calls.
type NextRouter = ReturnType<typeof useNextRouter>;
let liveRouter: NextRouter | null = null;

function navigate(method: "push" | "replace", href: Href) {
  const url = hrefToUrl(href);
  if (liveRouter) liveRouter[method](url);
  else if (typeof window !== "undefined") {
    if (method === "replace") window.location.replace(url);
    else window.location.assign(url);
  }
}

export const router = {
  push: (href: Href) => navigate("push", href),
  replace: (href: Href) => navigate("replace", href),
  navigate: (href: Href) => navigate("push", href),
  back: () => (liveRouter ? liveRouter.back() : typeof window !== "undefined" && window.history.back()),
  dismiss: () => (liveRouter ? liveRouter.back() : typeof window !== "undefined" && window.history.back()),
  dismissAll: () => navigate("replace", "/"),
  dismissTo: (href: Href) => navigate("replace", href),
  canGoBack: () => typeof window !== "undefined" && window.history.length > 1,
  setParams: () => {},
};

/** Mount once in the root layout so the global `router` has a live instance. */
export function RouterBridge() {
  const next = useNextRouter();
  useEffect(() => {
    liveRouter = next;
    return () => {
      if (liveRouter === next) liveRouter = null;
    };
  }, [next]);
  return null;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────
export function useRouter() {
  const next = useNextRouter();
  return useMemo(
    () => ({
      push: (href: Href) => next.push(hrefToUrl(href)),
      replace: (href: Href) => next.replace(hrefToUrl(href)),
      navigate: (href: Href) => next.push(hrefToUrl(href)),
      back: () => next.back(),
      dismiss: () => next.back(),
      dismissAll: () => next.replace("/"),
      dismissTo: (href: Href) => next.replace(hrefToUrl(href)),
      canGoBack: () => typeof window !== "undefined" && window.history.length > 1,
      setParams: () => {},
    }),
    [next],
  );
}

export function usePathname() {
  return useNextPathname();
}

/** expo's useLocalSearchParams = dynamic route params + query string, merged. */
export function useLocalSearchParams<T extends Record<string, string> = Record<string, string>>(): T {
  const params = useParams();
  const search = useSearchParams();
  return useMemo(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(params ?? {})) {
      out[k] = Array.isArray(v) ? v[0] : String(v ?? "");
    }
    search?.forEach((v, k) => {
      out[k] = v;
    });
    return out as T;
  }, [params, search]);
}

export const useGlobalSearchParams = useLocalSearchParams;

/** Native re-runs the effect on screen focus. On web we run it on mount and on
 *  pathname change, which covers the cache-refresh use cases the screens rely on. */
export function useFocusEffect(effect: () => void | (() => void)) {
  const pathname = useNextPathname();
  useEffect(() => {
    const cleanup = effect();
    return typeof cleanup === "function" ? cleanup : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
}

// ── Link ──────────────────────────────────────────────────────────────────────
export function Link({
  href,
  children,
  style,
  replace,
}: {
  href: Href;
  children?: ReactNode;
  style?: React.CSSProperties;
  asChild?: boolean;
  replace?: boolean;
}) {
  return (
    <NextLink href={hrefToUrl(href)} replace={replace} style={{ textDecoration: "none", color: "inherit", ...style }}>
      {children}
    </NextLink>
  );
}

// ── Redirect ──────────────────────────────────────────────────────────────────
export function Redirect({ href }: { href: Href }) {
  const next = useNextRouter();
  useEffect(() => {
    next.replace(hrefToUrl(href));
  }, [next, href]);
  return null;
}

// ── No-op layout primitives (expo Stack/Tabs are replaced by Next layouts) ─────
function StackScreen(_props: Record<string, unknown>) {
  return null;
}
export const Stack = Object.assign(function Stack({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}, { Screen: StackScreen });

function TabsScreen(_props: Record<string, unknown>) {
  return null;
}
export const Tabs = Object.assign(function Tabs({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}, { Screen: TabsScreen });

// ── SplashScreen (expo-router/expo-splash-screen) ─────────────────────────────
export const SplashScreen = {
  preventAutoHideAsync: async () => {},
  hideAsync: async () => {},
  setOptions: () => {},
};
