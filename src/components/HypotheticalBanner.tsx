"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import type { BranchData } from "@/types/branches";

const VALENCE_TEXT: Record<string, string> = {
  favorable: "#5D9020",
  neutral: "#8B887F",
  contested: "#B57217",
  adverse: "#A12B2B",
};

interface Props {
  branch: BranchData;
}

export function HypotheticalBanner({ branch }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const horizon = searchParams.get("t") ?? "+12w";

  const exit = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("branch");
    params.delete("t");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const color = VALENCE_TEXT[branch.valence] ?? "#6B675D";

  return (
    <motion.div
      initial={{ y: -32, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -32, opacity: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="h-8 bg-white border-b flex items-center justify-between px-5 flex-shrink-0"
      style={{ borderColor: "#F5E8E0" }}
    >
      <div className="flex items-center gap-2 text-[12px]">
        <span style={{ color }}>◈</span>
        <span className="text-[#6B675D]">Viewing:</span>
        <span className="font-medium font-mono" style={{ color }}>
          {branch.name}
        </span>
        <span className="text-[#9C9890]">· at {horizon} from now</span>
        <span className="text-[#9C9890] italic ml-2 truncate max-w-md">
          — {branch.description}
        </span>
      </div>
      <button
        onClick={exit}
        className="text-[12px] text-[#C9512D] hover:underline flex-shrink-0"
      >
        ← back to present
      </button>
    </motion.div>
  );
}
