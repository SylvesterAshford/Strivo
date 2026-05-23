"use client";

import { useState } from "react";

type Timeframe = "week" | "month" | "quarter" | "year" | "all";

const TABS: { id: Timeframe; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" },
  { id: "all", label: "All time" },
];

export function TimeframeBar() {
  const [active, setActive] = useState<Timeframe>("all");

  return (
    <div className="flex items-center gap-1 px-4 h-10 border-b border-[#E8E5DC] bg-white shrink-0">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActive(tab.id)}
          className={`px-3 py-1 rounded text-[12px] font-medium transition-colors ${
            active === tab.id
              ? "bg-[#F0EFEA] text-[#1A1A18]"
              : "text-[#9A9890] hover:text-[#2D2D2A] hover:bg-[#F4F3EE]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
