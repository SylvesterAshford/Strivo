"use client";

import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/Button";

interface Props {
  workspaceName: string;
  onUpload: () => void;
  onMaterials: () => void;
}

export function Header({ workspaceName, onUpload, onMaterials }: Props) {
  return (
    <header className="h-12 flex items-center justify-between px-4 border-b border-[#E8E5DC] bg-white shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#1A1A18]">
          LATTICE
        </span>
        <span className="text-[#D6D3CA]">/</span>
        <span className="text-[13px] text-[#6E6B62]">{workspaceName}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onMaterials}
          className="h-8 px-3 text-[12px] text-[#6B675D] hover:text-[#111110] hover:bg-[#F1EFEA] rounded transition-colors"
        >
          Materials
        </button>
        <Button variant="primary" onClick={onUpload} className="h-8 text-[12px] px-3">
          + Add material
        </Button>
        <UserButton />
      </div>
    </header>
  );
}
