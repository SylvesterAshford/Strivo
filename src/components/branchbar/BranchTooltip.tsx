"use client";

import type { BranchData } from "@/types/branches";

const VALENCE_COLORS: Record<string, string> = {
  main: "#C9512D",
  favorable: "#5D9020",
  neutral: "#8B887F",
  contested: "#B57217",
  adverse: "#A12B2B",
};

const VALENCE_LABELS: Record<string, string> = {
  favorable: "Favorable",
  neutral: "Neutral",
  contested: "Contested",
  adverse: "Adverse",
  main: "Main",
};

interface Props {
  branch: BranchData;
  x: number;
  y: number;
}

export function BranchTooltip({ branch, x, y }: Props) {
  const color = VALENCE_COLORS[branch.valence] ?? VALENCE_COLORS.neutral;

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left: x + 12, top: y - 12 }}
    >
      <div className="bg-white border border-[#DDDAD0] rounded-md shadow-lg p-3 max-w-xs">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="font-mono text-[12px] font-medium"
            style={{ color }}
          >
            {branch.name}
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{
              color,
              backgroundColor: `${color}18`,
              border: `1px solid ${color}40`,
            }}
          >
            {VALENCE_LABELS[branch.valence]}
          </span>
          <span className="text-[11px] text-[#9C9890] ml-auto">{branch.probability}%</span>
        </div>
        <p className="text-[11px] text-[#4A4740] leading-relaxed mb-1.5">
          {branch.description}
        </p>
        {branch.triggerEvent && (
          <div>
            <span className="text-[10px] uppercase tracking-wide text-[#9C9890]">Trigger: </span>
            <span className="text-[11px] text-[#6B675D]">{branch.triggerEvent}</span>
          </div>
        )}
      </div>
    </div>
  );
}
