"use client";

import { Tooltip } from "@/components/ui/Tooltip";

interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function ZoomControls({ onZoomIn, onZoomOut, onReset }: Props) {
  const btnClass =
    "w-8 h-8 flex items-center justify-center rounded text-[#6E6B62] hover:bg-[#F0EFEA] hover:text-[#1A1A18] transition-colors text-[16px]";

  return (
    <div className="absolute bottom-6 right-6 flex flex-col gap-1 bg-white border border-[#D6D3CA] rounded-lg p-1 shadow-sm">
      <Tooltip content="Zoom in (+)" side="left">
        <button onClick={onZoomIn} className={btnClass} aria-label="Zoom in">
          +
        </button>
      </Tooltip>
      <Tooltip content="Zoom out (−)" side="left">
        <button onClick={onZoomOut} className={btnClass} aria-label="Zoom out">
          −
        </button>
      </Tooltip>
      <Tooltip content="Reset view (⌘0)" side="left">
        <button onClick={onReset} className={btnClass} aria-label="Reset view">
          ⊙
        </button>
      </Tooltip>
    </div>
  );
}
