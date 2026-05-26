"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CommitData } from "@/types/branches";

interface Props {
  mainCommits: CommitData[];
  onCutoffChange: (cutoff: number | null) => void;
  onExit: () => void;
}

const SPEEDS = [1, 2, 4] as const;
type Speed = (typeof SPEEDS)[number];

const PLAY_DURATION_MS = 12000;

const TIME_LABELS: Record<number, string> = {
  0.25: "+4w",
  0.5: "+12w",
  0.75: "+26w",
  1: "future",
};

export function PlayForwardController({ mainCommits, onCutoffChange, onExit }: Props) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startProgressRef = useRef(0);

  useEffect(() => {
    onCutoffChange(progress);
  }, [progress, onCutoffChange]);

  const handleExit = useCallback(() => {
    setPlaying(false);
    onCutoffChange(null);
    onExit();
  }, [onCutoffChange, onExit]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      return;
    }

    startTimeRef.current = performance.now();
    startProgressRef.current = progress;

    const tick = (ts: number) => {
      const elapsed = (ts - startTimeRef.current!) * speed;
      const next = Math.min(1, startProgressRef.current + elapsed / PLAY_DURATION_MS);
      setProgress(next);
      if (next < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setPlaying(false);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, speed]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleExit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleExit]);

  const progressLabel = Object.entries(TIME_LABELS)
    .reverse()
    .find(([t]) => progress >= Number(t))?.[1] ?? "now";

  return (
    <div className="border-t border-[#DDDAD0] bg-white px-5 py-3 flex-shrink-0">
      <div className="flex items-center gap-4 mb-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#9C9890]">
          PLAY FORWARD
        </span>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="text-[11px] text-[#6B675D] hover:text-[#C9512D] font-mono"
        >
          {playing ? "⏸ Pause" : "▶ Play"}
        </button>
        <div className="flex gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: speed === s ? "#C9512D" : "#F5F4F0",
                color: speed === s ? "white" : "#6B675D",
              }}
            >
              {s}×
            </button>
          ))}
        </div>
        <button
          onClick={handleExit}
          className="text-[11px] text-[#9C9890] hover:text-[#4A4740] ml-auto"
        >
          × Exit
        </button>
      </div>

      <div
        className="relative h-1 bg-[#ECEAE3] rounded cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          setProgress(p);
          setPlaying(false);
        }}
      >
        <div
          className="absolute h-full bg-[#C9512D] rounded"
          style={{ width: `${progress * 100}%` }}
        />
        {mainCommits.map((c) => (
          <div
            key={c.id}
            className="absolute w-1.5 h-1.5 rounded-full top-1/2 -translate-y-1/2 -translate-x-1/2"
            style={{
              left: `${c.t * 100}%`,
              background: c.t <= progress ? "#C9512D" : "#DDDAD0",
            }}
          />
        ))}
        <div
          className="absolute w-3 h-3 bg-[#C9512D] rounded-full top-1/2 -translate-y-1/2 -translate-x-1/2"
          style={{ left: `${progress * 100}%` }}
        />
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-[#9C9890]">now</span>
        <span className="text-[10px] text-[#C9512D] font-medium">{progressLabel}</span>
        <span className="text-[10px] text-[#9C9890]">+26w</span>
      </div>
    </div>
  );
}
