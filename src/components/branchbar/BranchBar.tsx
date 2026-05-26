"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BranchGraph } from "./BranchGraph";
import { BranchTooltip } from "./BranchTooltip";
import { BranchLegend } from "./BranchLegend";
import { BranchBarShimmer } from "./BranchBarShimmer";
import { BranchBarEmpty } from "./BranchBarEmpty";
import type { BranchData } from "@/types/branches";

interface Props {
  workspaceId: string;
  initialBranches: BranchData[];
  initialStatus: "idle" | "generating" | "complete" | "failed";
  onPlayForward?: () => void;
}

export function BranchBar({ initialBranches, initialStatus, onPlayForward }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [branches, setBranches] = useState(initialBranches);
  const [status, setStatus] = useState(initialStatus);
  const [hoveredBranchId, setHoveredBranchId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const currentBranchName = searchParams.get("branch") ?? "main";

  useEffect(() => {
    if (status !== "generating") return;
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch("/api/branches/status");
        if (!res.ok) return;
        const data = await res.json() as { status: string; branches: BranchData[] };
        if (data.status !== "generating") {
          setBranches(data.branches);
          setStatus(data.status as "idle" | "generating" | "complete" | "failed");
          clearInterval(intervalId);
        }
      } catch {
        // network error, keep polling
      }
    }, 3000);
    return () => clearInterval(intervalId);
  }, [status]);

  const handleBranchClick = (branchName: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (branchName === "main") {
      params.delete("branch");
      params.delete("t");
    } else {
      params.set("branch", branchName);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const hoveredBranch = hoveredBranchId ? branches.find((b) => b.id === hoveredBranchId) : null;

  return (
    <div className="border-t border-[#DDDAD0] bg-white px-5 pt-3 pb-4 h-[180px] relative flex-shrink-0">
      <div className="flex justify-between items-baseline mb-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#9C9890]">
            TRAJECTORIES
          </span>
          <span className="text-[11px] font-mono text-[#6B675D]">
            on: {currentBranchName}
          </span>
          {status === "generating" && (
            <span className="text-[11px] text-[#9C9890] italic">generating…</span>
          )}
          {status === "failed" && (
            <span className="text-[11px] text-[#A12B2B]">generation failed</span>
          )}
        </div>
        <button
          className="text-[11px] text-[#6B675D] hover:text-[#C9512D] transition-colors"
          onClick={onPlayForward}
        >
          ▶ Play forward
        </button>
      </div>

      {status === "complete" && branches.length > 0 ? (
        <BranchGraph
          branches={branches}
          currentBranchName={currentBranchName}
          onBranchClick={handleBranchClick}
          onBranchHover={(id, x, y) => {
            setHoveredBranchId(id);
            setTooltipPos({ x, y });
          }}
          onBranchLeave={() => {
            setHoveredBranchId(null);
            setTooltipPos(null);
          }}
        />
      ) : status === "generating" ? (
        <BranchBarShimmer />
      ) : (
        <BranchBarEmpty />
      )}

      {hoveredBranch && tooltipPos && (
        <BranchTooltip
          branch={hoveredBranch}
          x={tooltipPos.x}
          y={tooltipPos.y}
        />
      )}

      <BranchLegend />
    </div>
  );
}
