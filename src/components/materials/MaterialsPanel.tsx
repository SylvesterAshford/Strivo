"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Trash2, FileText, Link, AlignLeft } from "lucide-react";
import { listMaterials } from "@/app/actions/list-materials";
import { deleteMaterial } from "@/app/actions/materials";

type Material = Awaited<ReturnType<typeof listMaterials>>[number];

interface Props {
  open: boolean;
  onClose: () => void;
}

const kindIcon = { file: FileText, url: Link, text: AlignLeft } as const;

export function MaterialsPanel({ open, onClose }: Props) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    startTransition(async () => {
      const rows = await listMaterials();
      setMaterials(rows);
      setLoading(false);
    });
  }, [open]);

  useEffect(() => {
    if (!open) {
      setConfirmId(null);
    }
  }, [open]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteMaterial(id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      setConfirmId(null);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end"
      onClick={onClose}
    >
      <aside
        className="relative h-full w-[400px] bg-white border-l border-[#DDDAD0] shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-[#ECEAE3] flex-shrink-0">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-[#9C9890]">
              WORKSPACE
            </p>
            <h2 className="text-[16px] font-semibold text-[#111110] tracking-[-0.016em]">
              Materials
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-[#9C9890] hover:text-[#111110] p-1">
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-[#F4F3EE] rounded animate-pulse" />
              ))}
            </div>
          ) : materials.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[#9C9890]">No materials yet.</div>
          ) : (
            <ul className="divide-y divide-[#F1EFEA]">
              {materials.map((m) => {
                const Icon = kindIcon[m.kind as keyof typeof kindIcon] ?? FileText;
                const isConfirming = confirmId === m.id;
                const isDeleting = deletingId === m.id;

                return (
                  <li key={m.id} className="px-5 py-3">
                    {isConfirming ? (
                      <div className="bg-[#FDF1EE] border border-[#F5C9BC] rounded-md p-3">
                        <p className="text-[12px] text-[#2A2A26] mb-3">
                          Delete <span className="font-medium">{m.title}</span>? Orphaned entities will be removed.
                        </p>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setConfirmId(null)}
                            className="px-3 py-1.5 text-[12px] text-[#6B675D]"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            disabled={isDeleting}
                            className="px-3 py-1.5 text-[12px] bg-[#A12B2B] text-white rounded disabled:opacity-50"
                          >
                            {isDeleting ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <Icon size={14} className="text-[#9C9890] mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-[#111110] truncate">{m.title}</p>
                          <p className="text-[11px] text-[#9C9890] mt-0.5">
                            {new Date(m.uploadedAt).toLocaleDateString()} · {m.entitiesAdded} entities
                          </p>
                        </div>
                        <button
                          onClick={() => setConfirmId(m.id)}
                          aria-label={`Delete ${m.title}`}
                          className="flex-shrink-0 p-1 text-[#C9C7BD] hover:text-[#A12B2B] transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
