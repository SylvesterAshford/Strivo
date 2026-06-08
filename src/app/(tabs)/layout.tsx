"use client";

import type { ReactNode } from "react";
import { FloatingDock } from "@/components/nav/FloatingDock";
import { Sidebar } from "@/components/nav/Sidebar";

// Responsive app shell for the four primary destinations + analytics detail
// screens. Desktop (≥1024px): left Sidebar + wide content area. Mobile: single
// column with the FloatingDock. The CSS classes (.app-sidebar / .app-dock) own
// the show/hide at the breakpoint.
export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Primary navigation">
        <Sidebar />
      </aside>
      <main className="app-main" role="main">
        {children}
      </main>
      <nav className="app-dock" aria-label="Primary navigation">
        <FloatingDock />
      </nav>
    </div>
  );
}
