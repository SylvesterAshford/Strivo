"use client";

import type { ReactNode } from "react";
import { resolveStyle, type RNStyle } from "@/rn";

// Cream canvas page wrapper. On phones it's a full-width single column with
// bottom padding that clears the floating dock; on desktop the content centers
// in a comfortable max-width and the dock clearance is dropped (sidebar nav).
// `contentStyle` can override the max-width (e.g. the Home feed uses a narrower
// column).
export function Screen({
  children,
  scroll = true,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: RNStyle;
}) {
  const inner = resolveStyle(contentStyle);
  return (
    <div className="screen-scroll">
      <div className={scroll ? "screen-content" : "screen-fill"} style={inner}>
        {children}
      </div>
    </div>
  );
}
