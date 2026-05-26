"use client";

export function BranchBarShimmer() {
  return (
    <div className="flex flex-col gap-3 pt-2 pb-1">
      {[60, 45, 75].map((width, i) => (
        <div
          key={i}
          className="h-1.5 rounded animate-pulse"
          style={{
            width: `${width}%`,
            backgroundColor: "#ECEAE3",
            animationDelay: `${i * 150}ms`,
          }}
        />
      ))}
    </div>
  );
}
