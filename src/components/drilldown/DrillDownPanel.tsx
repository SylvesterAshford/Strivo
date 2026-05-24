"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, ArrowLeft } from "lucide-react";
import { MentionCard } from "./MentionCard";
import { DocumentViewer } from "@/components/viewer/DocumentViewer";
import { loadEntitySummary } from "@/app/actions/drilldown";

interface DrillDownData {
  entity: {
    id: string;
    name: string;
    kind: string;
    summary: string | null;
    firstSeenAt: Date;
    lastSeenAt: Date;
  };
  mentions: Array<{
    id: string;
    materialId: string;
    materialTitle: string;
    materialKind: string;
    passage: string;
    passageStart: number | null;
    passageEnd: number | null;
    uploadedAt: Date;
  }>;
  connectedEntities: Array<{
    id: string;
    name: string;
    kind: string;
    relationshipKind: string;
  }>;
}

interface AiSummary {
  summary: string;
  strategicRead: string;
}

interface Props {
  data: DrillDownData | null;
  loading: boolean;
}

export function DrillDownPanel({ data, loading }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewerMaterialId, setViewerMaterialId] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<AiSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!data) {
      setAiSummary(null);
      return;
    }
    setAiSummary(null);
    if (data.mentions.length === 0) return;

    setSummaryLoading(true);
    startTransition(async () => {
      try {
        const result = await loadEntitySummary(data.entity.id);
        setAiSummary(result);
      } catch {
        // summary unavailable, no-op
      } finally {
        setSummaryLoading(false);
      }
    });
  }, [data?.entity.id]);

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("node");
    const search = params.toString();
    router.push(search ? `/?${search}` : "/", { scroll: false });
  }

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape" && !viewerMaterialId) close();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  function selectEntity(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("node", id);
    router.push(`/?${params.toString()}`, { scroll: false });
  }

  const viewerMention = viewerMaterialId
    ? data?.mentions.find((m) => m.materialId === viewerMaterialId) ?? null
    : null;

  if (!data && !loading) return null;
  if (!data) {
    return (
      <aside className="fixed right-0 top-14 bottom-0 w-[440px] bg-[#F7F6F2] border-l border-[#DDDAD0] z-30">
        <header className="sticky top-0 bg-[#F7F6F2] border-b border-[#DDDAD0] z-10 px-5 py-3 flex items-center justify-between">
          <button
            onClick={close}
            className="flex items-center gap-2 text-[12px] text-[#6B675D] hover:text-[#111110]"
          >
            <ArrowLeft size={14} />
            Back to map
          </button>
          <button onClick={close} aria-label="Close" className="text-[#9C9890] hover:text-[#111110]">
            <X size={16} />
          </button>
        </header>
        <div className="p-8 space-y-4">
          <div className="h-4 w-16 bg-[#ECEAE3] rounded animate-pulse" />
          <div className="h-7 w-48 bg-[#ECEAE3] rounded animate-pulse" />
          <div className="h-4 w-full bg-[#ECEAE3] rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-[#ECEAE3] rounded animate-pulse" />
        </div>
      </aside>
    );
  }

  const displaySummary = aiSummary?.summary ?? data.entity.summary;

  return (
    <>
      <aside
        className="fixed right-0 top-14 bottom-0 w-[440px] bg-[#F7F6F2] border-l border-[#DDDAD0] z-30 overflow-y-auto"
        role="dialog"
        aria-label={`Details for ${data.entity.name}`}
      >
        <header className="sticky top-0 bg-[#F7F6F2] border-b border-[#DDDAD0] z-10 px-5 py-3 flex items-center justify-between">
          <button
            onClick={close}
            className="flex items-center gap-2 text-[12px] text-[#6B675D] hover:text-[#111110]"
          >
            <ArrowLeft size={14} />
            Back to map
          </button>
          <button onClick={close} aria-label="Close" className="text-[#9C9890] hover:text-[#111110]">
            <X size={16} />
          </button>
        </header>

        <div className="p-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] font-medium bg-white border border-[#DDDAD0] rounded">
              {data.entity.kind}
            </span>
          </div>
          <h2 className="text-[24px] font-semibold text-[#111110] tracking-[-0.024em] leading-tight mb-3">
            {data.entity.name}
          </h2>
          {displaySummary && (
            <p className="text-[13px] leading-relaxed text-[#2A2A26]">{displaySummary}</p>
          )}
          <p className="mt-3 text-[11px] text-[#9C9890] font-mono">
            Last seen {new Date(data.entity.lastSeenAt).toLocaleDateString()}
          </p>
        </div>

        <div className="h-px bg-[#ECEAE3]" />

        <section className="p-6">
          <p className="text-[10px] uppercase tracking-[0.08em] font-medium text-[#9C9890] mb-3">
            MENTIONS · {data.mentions.length} TOTAL
          </p>
          {data.mentions.length === 0 ? (
            <p className="text-[12px] text-[#9C9890]">No mentions found yet.</p>
          ) : (
            <div className="space-y-3">
              {data.mentions.map((m) => (
                <MentionCard key={m.id} mention={m} onOpenViewer={setViewerMaterialId} />
              ))}
            </div>
          )}
        </section>

        <div className="h-px bg-[#ECEAE3]" />

        <section className="p-6">
          <p className="text-[10px] uppercase tracking-[0.08em] font-medium text-[#9C9890] mb-3">
            CONNECTED TO
          </p>
          {data.connectedEntities.length === 0 ? (
            <p className="text-[12px] text-[#9C9890]">No connections yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.connectedEntities.map((c) => (
                <li key={c.id} className="text-[12px]">
                  <button
                    onClick={() => selectEntity(c.id)}
                    className="text-left text-[#2A2A26] hover:text-[#111110] hover:underline"
                  >
                    → {c.name}
                  </button>
                  <span className="ml-2 text-[#6B675D]">{c.relationshipKind}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="h-px bg-[#ECEAE3]" />

        <section className="p-6">
          <p className="text-[10px] uppercase tracking-[0.08em] font-medium text-[#9C9890] mb-3">
            STRATEGIC READ
          </p>
          {summaryLoading ? (
            <p className="text-[12px] text-[#9C9890] animate-pulse">Generating...</p>
          ) : aiSummary?.strategicRead ? (
            <p className="text-[13px] leading-relaxed text-[#2A2A26]">
              {aiSummary.strategicRead}
            </p>
          ) : data.mentions.length === 0 ? (
            <p className="text-[12px] text-[#9C9890]">No mentions yet to generate a strategic read.</p>
          ) : null}
        </section>
      </aside>

      {viewerMention && (
        <DocumentViewer
          open={!!viewerMaterialId}
          onClose={() => setViewerMaterialId(null)}
          materialId={viewerMention.materialId}
          entityMentions={data.mentions.filter((m) => m.materialId === viewerMention.materialId)}
        />
      )}
    </>
  );
}
