"use client";

import { AppText } from "./AppText";
import type { RNStyle } from "@/rn";

// English mono caps label per design.md 7.2 — always secondary color, 2.0 tracking.
// For Burmese content, skip letterSpacing (would shatter syllables) and
// textTransform (no-op). AppText already zeroes tracking for Burmese; here we
// add uppercase + tracking only for Latin.
const BURMESE_RE = /[က-႟]/;

export function Eyebrow({ children, style }: { children: string; style?: RNStyle }) {
  const isBurmese = BURMESE_RE.test(children);
  const base: RNStyle = isBurmese ? {} : { textTransform: "uppercase", letterSpacing: 2.0 };
  return (
    <AppText variant="monoEyebrow" color="secondary" style={[base, style]}>
      {children}
    </AppText>
  );
}
