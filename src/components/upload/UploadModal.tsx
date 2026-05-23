"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FileDropZone } from "./FileDropZone";
import { PasteInput } from "./PasteInput";
import { ProcessingView } from "./ProcessingView";

type Mode = "file" | "paste";
type State =
  | { kind: "input" }
  | { kind: "uploading" }
  | { kind: "processing"; materialId: string }
  | { kind: "complete"; stats: { entitiesAdded: number; entitiesUpdated: number; edgesAdded: number } }
  | { kind: "error"; message: string };

export function UploadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("file");
  const [state, setState] = useState<State>({ kind: "input" });
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [contextNote, setContextNote] = useState("");
  const router = useRouter();

  const canClose =
    state.kind === "input" || state.kind === "complete" || state.kind === "error";

  const handleSubmit = useCallback(async () => {
    setState({ kind: "uploading" });

    const formData = new FormData();
    if (mode === "file" && file) {
      formData.append("kind", "file");
      formData.append("file", file);
    } else if (mode === "paste" && pastedText.trim()) {
      formData.append("kind", "text");
      formData.append("text", pastedText);
    } else {
      setState({ kind: "error", message: "Please provide content to upload." });
      return;
    }
    if (contextNote.trim()) formData.append("contextNote", contextNote);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setState({ kind: "error", message: data.error || "Upload failed." });
        return;
      }
      setState({ kind: "processing", materialId: data.materialId });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error.",
      });
    }
  }, [mode, file, pastedText, contextNote]);

  const handleDone = useCallback(() => {
    onClose();
    router.refresh();
    setState({ kind: "input" });
    setFile(null);
    setPastedText("");
    setContextNote("");
  }, [onClose, router]);

  return (
    <Modal open={open} onClose={canClose ? onClose : undefined}>
      <div className="w-[640px] p-8">
        {state.kind === "input" && (
          <>
            <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-[#9C9890] mb-3">
              ADD TO YOUR GRAPH
            </p>
            <h2 className="text-[20px] font-medium text-[#111110] tracking-[-0.018em] mb-2">
              What did you find?
            </h2>
            <p className="text-[13px] text-[#6B675D] mb-6">
              Drop a document or paste text. Lattice will extract entities and update the graph.
            </p>

            <div className="flex gap-1 mb-4 border-b border-[#ECEAE3]">
              <button
                onClick={() => setMode("file")}
                className={`px-3 py-2 text-[12px] font-medium transition-colors ${
                  mode === "file"
                    ? "text-[#111110] border-b-2 border-[#C9512D] -mb-px"
                    : "text-[#6B675D] hover:text-[#2D2D2A]"
                }`}
              >
                File
              </button>
              <button
                onClick={() => setMode("paste")}
                className={`px-3 py-2 text-[12px] font-medium transition-colors ${
                  mode === "paste"
                    ? "text-[#111110] border-b-2 border-[#C9512D] -mb-px"
                    : "text-[#6B675D] hover:text-[#2D2D2A]"
                }`}
              >
                Paste
              </button>
            </div>

            {mode === "file" ? (
              <FileDropZone file={file} onFileChange={setFile} />
            ) : (
              <PasteInput value={pastedText} onChange={setPastedText} />
            )}

            <div className="mt-5">
              <label className="block text-[11px] uppercase tracking-[0.08em] font-medium text-[#9C9890] mb-2">
                WHY ARE YOU ADDING THIS? (OPTIONAL)
              </label>
              <input
                type="text"
                value={contextNote}
                onChange={(e) => setContextNote(e.target.value)}
                placeholder="e.g., preparing for board meeting"
                className="w-full h-10 px-3 bg-[#F1EFEA] border border-[#DDDAD0] rounded-md text-[13px] focus:outline-none focus:border-[#C9512D] transition-colors"
              />
            </div>

            <div className="flex justify-between items-center mt-8">
              <span className="text-[12px] text-[#9C9890]">PDF, MD, TXT, DOCX. Up to 50MB.</span>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={
                    (mode === "file" && !file) ||
                    (mode === "paste" && pastedText.trim().length < 10)
                  }
                >
                  Add to graph
                </Button>
              </div>
            </div>
          </>
        )}

        {state.kind === "uploading" && (
          <div className="py-12 text-center">
            <p className="text-[13px] text-[#6B675D]">Uploading...</p>
          </div>
        )}

        {state.kind === "processing" && (
          <ProcessingView
            materialId={state.materialId}
            onComplete={(stats) => setState({ kind: "complete", stats })}
            onError={(message) => setState({ kind: "error", message })}
          />
        )}

        {state.kind === "complete" && (
          <div className="py-8">
            <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-[#5D9020] mb-3">
              COMPLETE
            </p>
            <h2 className="text-[20px] font-medium text-[#111110] tracking-[-0.018em] mb-4">
              Your graph has grown.
            </h2>
            <ul className="space-y-2 text-[13px] text-[#2A2A26] mb-8">
              <li>→ Added {state.stats.entitiesAdded} new entities</li>
              <li>→ Updated {state.stats.entitiesUpdated} existing entities</li>
              <li>→ Added {state.stats.edgesAdded} new relationships</li>
            </ul>
            <div className="flex justify-end">
              <Button variant="primary" onClick={handleDone}>
                View on graph
              </Button>
            </div>
          </div>
        )}

        {state.kind === "error" && (
          <div className="py-8">
            <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-[#A12B2B] mb-3">
              UPLOAD FAILED
            </p>
            <p className="text-[13px] text-[#2A2A26] mb-6">{state.message}</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
              <Button variant="primary" onClick={() => setState({ kind: "input" })}>
                Try again
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
