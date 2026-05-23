"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function PasteInput({ value, onChange }: Props) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Paste any text — articles, notes, reports, memos..."
      className="w-full rounded-xl border border-[#D6D3CA] bg-[#F4F3EE] p-4 text-[13px] text-[#2D2D2A] placeholder-[#9A9890] resize-none focus:outline-none focus:border-[#C9512D] transition-colors"
      style={{ minHeight: 200 }}
      spellCheck={false}
    />
  );
}
