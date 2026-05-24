"use client";

export function UrlInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="w-full">
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://example.com/article"
        className="w-full h-11 px-3 bg-[#F1EFEA] border border-[#DDDAD0] rounded-md text-[14px] focus:border-[#B0ADA1] focus:outline-none focus:ring-3 focus:ring-[#C9512D]/18"
      />
      <p className="mt-2 text-[12px] text-[#9C9890]">
        Lattice fetches the article and extracts the main content.
      </p>
    </div>
  );
}
