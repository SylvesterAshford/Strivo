"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Props {
  workspaceCreatedAt: Date;
  onCutoffChange: (cutoff: Date | null) => void;
  onExit: () => void;
}

const SPEEDS = [1, 2, 4] as const;
type Speed = (typeof SPEEDS)[number];

const PLAY_DURATION_MS = 12000;

export function PlayHistoryController({ workspaceCreatedAt, onCutoffChange, onExit }: Props) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startProgressRef = useRef(0);

  // Fixed at mount time — represents the full history span from creation to "now"
  const rangeMs = useMemo(
    () => Date.now() - workspaceCreatedAt.getTime(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const progressToCutoff = useCallback(
    (p: number) => new Date(workspaceCreatedAt.getTime() + p * rangeMs),
    [workspaceCreatedAt, rangeMs],
  );

  useEffect(() => {
    onCutoffChange(progressToCutoff(progress));
  }, [progress, progressToCutoff, onCutoffChange]);

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

  const formatDate = (p: number) => {
    const d = progressToCutoff(p);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="border-t border-[#DDDAD0] bg-white px-5 py-3 flex-shrink-0">
      <div className="flex items-center gap-4 mb-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#9C9890]">
          PLAY HISTORY
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

      <div className="relative h-1 bg-[#ECEAE3] rounded cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          setProgress(p);
          setPlaying(false);
        }}
      >
        <div
          className="absolute h-full bg-[#C9512D] rounded transition-none"
          style={{ width: `${progress * 100}%` }}
        />
        <div
          className="absolute w-3 h-3 bg-[#C9512D] rounded-full top-1/2 -translate-y-1/2 -translate-x-1/2"
          style={{ left: `${progress * 100}%` }}
        />
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-[#9C9890]">{formatDate(0)}</span>
        <span className="text-[10px] text-[#C9512D] font-medium">{formatDate(progress)}</span>
        <span className="text-[10px] text-[#9C9890]">now</span>
      </div>
    </div>
  );
}
