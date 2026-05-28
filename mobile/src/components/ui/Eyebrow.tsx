import { type TextStyle } from "react-native";
import { AppText } from "./AppText";

// English mono caps label per design.md 7.2 — always secondary color, 2.0 tracking.
// Routes through AppText so Burmese strings auto-swap to NotoSansMyanmar and
// get the lineHeight floor. For Burmese content, skip letterSpacing (would
// shatter syllables like "ဖော" into "ဖော က်သ") and textTransform (no-op).
const BURMESE_RE = /[က-႟]/;

export function Eyebrow({ children, style }: { children: string; style?: TextStyle }) {
  const isBurmese = BURMESE_RE.test(children);
  const base: TextStyle = isBurmese
    ? {}
    : { textTransform: "uppercase", letterSpacing: 2.0 };
  return (
    <AppText variant="monoEyebrow" color="secondary" style={[base, style]}>
      {children}
    </AppText>
  );
}
