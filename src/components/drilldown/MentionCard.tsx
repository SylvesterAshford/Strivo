"use client";

interface Mention {
  id: string;
  materialId: string;
  materialTitle: string;
  materialKind: string;
  passage: string;
  passageStart: number | null;
  passageEnd: number | null;
  uploadedAt: Date;
}

interface Props {
  mention: Mention;
  onOpenViewer?: (materialId: string) => void;
}

export function MentionCard({ mention, onOpenViewer }: Props) {
  return (
    <button
      onClick={() => onOpenViewer?.(mention.materialId)}
      className="w-full text-left bg-white border border-[#DDDAD0] rounded-[6px] p-4 hover:border-[#B0ADA1] transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.08em] font-medium text-[#9C9890]">
          {mention.materialKind}
        </span>
        <span className="text-[11px] text-[#9C9890] font-mono">
          {new Date(mention.uploadedAt).toLocaleDateString()}
        </span>
      </div>
      <p className="text-[11px] font-medium text-[#2A2A26] mb-1 truncate">{mention.materialTitle}</p>
      <p className="text-[12px] text-[#6B675D] leading-relaxed line-clamp-2">{mention.passage}</p>
    </button>
  );
}
