"use client";

import { useEffect, useRef, useState } from "react";

// Animates a number from 0 → target with easeOutCubic on mount. Used for the
// hero metric so the headline figure "counts up" — a small premium touch that
// draws the eye to the number that matters. Honors prefers-reduced-motion.
export function useCountUp(target: number, durationMs = 700): number {
  // Start at the target so the static/skip cases (SSR, reduced-motion, zero)
  // need no state write at all. When animating, the first rAF frame drives the
  // value from 0 → target, so the count-up still plays without a synchronous
  // setState inside the effect.
  const [value, setValue] = useState(target);
  const rafRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // Skip cases: value already equals target (lazy initial state), so nothing
    // to do — no synchronous setState needed.
    if (reduce || target === 0) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else setValue(target);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, durationMs]);

  return value;
}
