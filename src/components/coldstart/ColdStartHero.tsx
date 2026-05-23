"use client";

interface Props {
  onUpload: () => void;
}

export function ColdStartHero({ onUpload }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAFAF7] px-6">
      <div className="max-w-2xl w-full text-center mb-10">
        <p className="text-[11px] uppercase tracking-[0.14em] font-medium text-[#9A9890] mb-4">
          LATTICE
        </p>
        <h1 className="text-[32px] font-medium text-[#1A1A18] tracking-[-0.022em] leading-[1.2] mb-4">
          Upload anything you read.
          <br />
          See your strategic position emerge.
        </h1>
        <p className="text-[15px] text-[#6E6B62] leading-relaxed">
          Drop a report, article, or memo. Lattice extracts every entity and relationship, then
          builds a graph of your competitive landscape.
        </p>
      </div>

      {/* Upload box */}
      <button
        onClick={onUpload}
        className="w-full max-w-[720px] h-[320px] border-2 border-dashed border-[#B5B2A8] rounded-xl bg-[#F4F3EE] hover:border-[#C9512D] hover:bg-[#F5E8E0] transition-colors flex flex-col items-center justify-center gap-4 group"
      >
        <div className="w-12 h-12 rounded-full bg-white border border-[#D6D3CA] flex items-center justify-center group-hover:border-[#C9512D] transition-colors">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path
              d="M11 3v12M7 7l4-4 4 4M3 18h16"
              stroke="#6E6B62"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="group-hover:stroke-[#C9512D] transition-colors"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-[15px] font-medium text-[#2D2D2A] group-hover:text-[#C9512D] transition-colors">
            Drop your first material
          </p>
          <p className="text-[12px] text-[#9A9890] mt-1">PDF, MD, TXT, DOCX — or paste text</p>
        </div>
      </button>

      {/* Example cards */}
      <div className="flex gap-3 mt-6 text-[12px] text-[#9A9890]">
        {["Annual report", "Analyst memo", "Industry news", "Internal strategy doc"].map(
          (label) => (
            <span
              key={label}
              className="px-3 py-1.5 rounded-full border border-[#E8E5DC] bg-white"
            >
              {label}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
