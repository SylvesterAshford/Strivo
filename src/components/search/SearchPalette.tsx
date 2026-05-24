"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { searchAll } from "@/app/actions/search";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SearchPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    entities: Array<{ id: string; name: string; kind: string }>;
    materials: Array<{ id: string; title: string }>;
  }>({ entities: [], materials: [] });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!query.trim()) {
      setResults({ entities: [], materials: [] });
      return;
    }
    const timeoutId = setTimeout(() => {
      startTransition(async () => {
        const r = await searchAll(query);
        setResults(r);
      });
    }, 150);
    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults({ entities: [], materials: [] });
    }
  }, [open]);

  if (!open) return null;

  function selectEntity(id: string) {
    onClose();
    router.push(`/?node=${id}`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/20"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[560px] bg-white border border-[#DDDAD0] rounded-xl overflow-hidden shadow-2xl"
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search entities, materials..."
          className="w-full h-12 px-4 text-[15px] border-b border-[#ECEAE3] focus:outline-none"
        />
        <div className="max-h-[400px] overflow-y-auto">
          {results.entities.length > 0 && (
            <div>
              <p className="px-4 py-2 text-[10px] uppercase tracking-[0.08em] font-medium text-[#9C9890]">
                ENTITIES
              </p>
              {results.entities.map((e) => (
                <button
                  key={e.id}
                  onClick={() => selectEntity(e.id)}
                  className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-[#F1EFEA]"
                >
                  <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider bg-[#F1EFEA] rounded">
                    {e.kind}
                  </span>
                  <span className="text-[14px]">{e.name}</span>
                </button>
              ))}
            </div>
          )}
          {results.materials.length > 0 && (
            <div>
              <p className="px-4 py-2 text-[10px] uppercase tracking-[0.08em] font-medium text-[#9C9890]">
                MATERIALS
              </p>
              {results.materials.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {}}
                  className="w-full px-4 py-2 text-left text-[14px] hover:bg-[#F1EFEA]"
                >
                  {m.title}
                </button>
              ))}
            </div>
          )}
          {query && !isPending && results.entities.length === 0 && results.materials.length === 0 && (
            <div className="p-6 text-center text-[13px] text-[#9C9890]">
              No results for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
