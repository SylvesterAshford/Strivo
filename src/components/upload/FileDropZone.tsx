"use client";

import { useCallback, useRef, useState } from "react";

interface Props {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

const ACCEPTED = [".pdf", ".md", ".txt", ".docx"];

export function FileDropZone({ file, onFileChange }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) onFileChange(dropped);
    },
    [onFileChange],
  );

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors cursor-pointer select-none h-[200px] ${
        dragging
          ? "border-[#C9512D] bg-[#F5E8E0]"
          : "border-[#B5B2A8] bg-[#F4F3EE] hover:border-[#C9512D] hover:bg-[#F5E8E0]"
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="sr-only"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <div className="flex flex-col items-center gap-2 px-6 text-center">
          <span className="text-[24px]">📄</span>
          <p className="text-[13px] font-medium text-[#2D2D2A] break-all">{file.name}</p>
          <p className="text-[11px] text-[#9A9890]">
            {(file.size / 1024).toFixed(0)} KB — click to change
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 px-6 text-center">
          <div className="w-10 h-10 rounded-full bg-[#E8E5DC] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 2v9M6 5l3-3 3 3M3 14h12"
                stroke="#6E6B62"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-[13px] text-[#2D2D2A]">
            Drop a file here, or <span className="text-[#C9512D]">click to browse</span>
          </p>
          <p className="text-[11px] text-[#9A9890]">PDF, MD, TXT, DOCX — up to 50MB</p>
        </div>
      )}
    </div>
  );
}
