"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { X, Trash2 } from "lucide-react";
import { deleteMaterial } from "@/app/actions/materials";
import { getMaterialContent } from "@/app/actions/viewer";
import { useRouter } from "next/navigation";

interface EntityMention {
  id: string;
  passage: string;
  passageStart: number | null;
  passageEnd: number | null;
}

interface MaterialData {
  id: string;
  title: string;
  kind: string;
  contentText: string;
  sourceUrl: string | null;
  uploadedAt: Date;
  contextNote: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  materialId: string;
  entityMentions: EntityMention[];
}

export function DocumentViewer({ open, onClose, materialId, entityMentions }: Props) {
  const [material, setMaterial] = useState<MaterialData | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open || !materialId) return;
    setLoading(true);
    getMaterialContent(materialId)
      .then(setMaterial)
      .catch(() => setMaterial(null))
      .finally(() => setLoading(false));
  }, [open, materialId]);

  useEffect(() => {
    if (!open) {
      setConfirmingDelete(false);
      setDeleteError(null);
    }
  }, [open]);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteMaterial(materialId);
      onClose();
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  const highlightedPassages = entityMentions
    .filter((m) => m.passageStart != null && m.passageEnd != null)
    .map((m) => ({ start: m.passageStart as number, end: m.passageEnd as number }));

  const renderContent = () => {
    if (!material) return null;
    const text = material.contentText;

    if (highlightedPassages.length === 0) {
      return <span>{text}</span>;
    }

    const segments: Array<{ text: string; highlighted: boolean }> = [];
    const sorted = [...highlightedPassages].sort((a, b) => a.start - b.start);
    let cursor = 0;

    for (const hp of sorted) {
      if (hp.start > cursor) {
        segments.push({ text: text.slice(cursor, hp.start), highlighted: false });
      }
      segments.push({ text: text.slice(hp.start, hp.end), highlighted: true });
      cursor = hp.end;
    }
    if (cursor < text.length) {
      segments.push({ text: text.slice(cursor), highlighted: false });
    }

    return (
      <>
        {segments.map((s, i) =>
          s.highlighted ? (
            <mark key={i} className="bg-[#F3E4DA] px-0.5">
              {s.text}
            </mark>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
      </>
    );
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="w-[760px] max-h-[80vh] flex flex-col">
        <header className="px-6 py-4 border-b border-[#ECEAE3] flex items-center justify-between flex-shrink-0">
          <div className="flex-1 min-w-0 mr-4">
            <p className="text-[10px] uppercase tracking-[0.08em] font-medium text-[#9C9890] mb-1">
              {material?.kind?.toUpperCase() ?? ""}
            </p>
            <h2 className="text-[18px] font-semibold text-[#111110] tracking-[-0.018em] truncate">
              {material?.title ?? "Loading..."}
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setConfirmingDelete(true)}
              aria-label="Delete material"
              className="p-2 text-[#9C9890] hover:text-[#A12B2B]"
            >
              <Trash2 size={16} />
            </button>
            <button onClick={onClose} aria-label="Close" className="p-2 text-[#9C9890] hover:text-[#111110]">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="overflow-y-auto p-6 text-[14px] leading-relaxed text-[#2A2A26] whitespace-pre-wrap flex-1">
          {loading ? (
            <p className="text-[13px] text-[#9C9890]">Loading...</p>
          ) : (
            renderContent()
          )}
        </div>

        {confirmingDelete && (
          <div className="px-6 py-4 border-t border-[#ECEAE3] bg-[#F1EFEA] flex-shrink-0">
            {deleteError && (
              <p className="text-[12px] text-[#A12B2B] mb-2">{deleteError}</p>
            )}
            <p className="text-[13px] text-[#2A2A26] mb-3">
              Delete this material? Entities only referenced by this material will also be removed.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="px-3 py-1.5 text-[12px] text-[#6B675D]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 text-[12px] bg-[#A12B2B] text-white rounded disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
