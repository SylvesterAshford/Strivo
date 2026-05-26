"use client";

import type { BranchData } from "@/types/branches";

const VIEWBOX_WIDTH = 1200;
const VIEWBOX_HEIGHT = 120;
const MAIN_Y = 60;

const VALENCE_COLORS: Record<string, string> = {
  main: "#C9512D",
  favorable: "#5D9020",
  neutral: "#8B887F",
  contested: "#B57217",
  adverse: "#A12B2B",
};

interface Props {
  branches: BranchData[];
  currentBranchName: string;
  onBranchClick: (name: string) => void;
  onBranchHover: (id: string, x: number, y: number) => void;
  onBranchLeave: () => void;
}

export function BranchGraph({
  branches,
  currentBranchName,
  onBranchClick,
  onBranchHover,
  onBranchLeave,
}: Props) {
  const mainBranch = branches.find((b) => b.name === "main");
  const subBranches = branches.filter((b) => b.name !== "main");

  if (!mainBranch) return null;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      className="w-full h-[120px]"
      preserveAspectRatio="none"
    >
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={t * VIEWBOX_WIDTH}
          y1={5}
          x2={t * VIEWBOX_WIDTH}
          y2={VIEWBOX_HEIGHT - 5}
          stroke="#ECEAE3"
          strokeWidth={0.5}
          strokeDasharray="2 3"
        />
      ))}
      <text x={0} y={12} fontSize={9} fill="#9C9890" fontFamily="Inter">now</text>
      <text x={VIEWBOX_WIDTH * 0.25} y={12} fontSize={9} fill="#9C9890" textAnchor="middle">+4w</text>
      <text x={VIEWBOX_WIDTH * 0.5} y={12} fontSize={9} fill="#9C9890" textAnchor="middle">+12w</text>
      <text x={VIEWBOX_WIDTH * 0.75} y={12} fontSize={9} fill="#9C9890" textAnchor="middle">+26w</text>
      <text x={VIEWBOX_WIDTH - 30} y={12} fontSize={9} fill="#9C9890" textAnchor="end">future</text>

      <line
        x1={0}
        y1={MAIN_Y}
        x2={VIEWBOX_WIDTH}
        y2={MAIN_Y}
        stroke={VALENCE_COLORS.main}
        strokeWidth={currentBranchName === "main" ? 3 : 2.5}
        opacity={0.9}
      />

      {subBranches.map((branch) => {
        const startX = branch.divergeAt * VIEWBOX_WIDTH;
        const endX = VIEWBOX_WIDTH - 8;
        const endY = MAIN_Y - branch.divergeY;
        const ctrlX = startX + (endX - startX) * 0.5;
        const path = `M ${startX} ${MAIN_Y} C ${ctrlX} ${MAIN_Y}, ${ctrlX} ${endY}, ${endX} ${endY}`;
        const color = VALENCE_COLORS[branch.valence] ?? VALENCE_COLORS.neutral;
        const strokeWidth = 1.2 + (branch.probability / 60) * 1.3;
        const isActive = currentBranchName === branch.name;

        return (
          <g key={branch.id}>
            <path
              d={path}
              stroke={color}
              strokeWidth={isActive ? strokeWidth + 0.7 : strokeWidth}
              fill="none"
              opacity={0.85}
              style={{ cursor: "pointer", transition: "stroke-width 120ms" }}
              onClick={() => onBranchClick(branch.name)}
              onMouseEnter={(e) => onBranchHover(branch.id, e.clientX, e.clientY)}
              onMouseLeave={onBranchLeave}
            />
            <circle
              cx={endX}
              cy={endY}
              r={5}
              fill="white"
              stroke={color}
              strokeWidth={2}
              style={{ pointerEvents: "none" }}
            />
            <text
              x={endX - 12}
              y={endY + 3}
              fontSize={10}
              fontFamily="JetBrains Mono, monospace"
              fill={color}
              textAnchor="end"
              style={{ pointerEvents: "none" }}
            >
              {branch.name}
            </text>
          </g>
        );
      })}

      {mainBranch.commits?.map((commit) => (
        <circle
          key={commit.id}
          cx={commit.t * VIEWBOX_WIDTH}
          cy={MAIN_Y}
          r={4}
          fill={VALENCE_COLORS.main}
        />
      ))}

      <circle cx={0} cy={MAIN_Y} r={6} fill={VALENCE_COLORS.main} />
      <circle cx={0} cy={MAIN_Y} r={3} fill="white" />
    </svg>
  );
}
