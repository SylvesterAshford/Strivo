"use client";

const ITEMS = [
  { color: "#C9512D", label: "main" },
  { color: "#5D9020", label: "favorable" },
  { color: "#8B887F", label: "neutral" },
  { color: "#B57217", label: "contested" },
  { color: "#A12B2B", label: "adverse" },
];

export function BranchLegend() {
  return (
    <div className="absolute bottom-2 left-5 flex items-center gap-4">
      {ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-1">
          <div
            className="w-3 h-0.5 rounded"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-[10px] text-[#9C9890]">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
