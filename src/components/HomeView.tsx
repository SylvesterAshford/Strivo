"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { NodeContextMenu } from "@/components/graph/NodeContextMenu";
import { Header } from "@/components/chrome/Header";
import { TimeframeBar } from "@/components/chrome/TimeframeBar";
import { ZoomControls } from "@/components/chrome/ZoomControls";
import { UploadModal } from "@/components/upload/UploadModal";
import { DrillDownPanel } from "@/components/drilldown/DrillDownPanel";
import { SearchPalette } from "@/components/search/SearchPalette";
import { MaterialsPanel } from "@/components/materials/MaterialsPanel";
import { loadDrillDown } from "@/app/actions/drilldown";
import type { GraphNode, GraphEdge } from "@/types/graph";

type DrillDownData = Awaited<ReturnType<typeof loadDrillDown>>;

interface Props {
  workspace: { id: string; name: string };
  nodes: GraphNode[];
  edges: GraphEdge[];
  initialDrillDown: DrillDownData | null;
}

interface ContextMenu {
  entityId: string;
  x: number;
  y: number;
}

export function HomeView({ workspace, nodes, edges, initialDrillDown }: Props) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(initialDrillDown);
  const [drillDownLoading, setDrillDownLoading] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeNodeId = searchParams.get("node");

  useEffect(() => {
    if (!activeNodeId) {
      setDrillDownData(null);
      return;
    }
    if (initialDrillDown && initialDrillDown.entity.id === activeNodeId) {
      setDrillDownData(initialDrillDown);
      return;
    }
    setDrillDownLoading(true);
    startTransition(async () => {
      try {
        const data = await loadDrillDown(activeNodeId);
        setDrillDownData(data);
      } catch {
        setDrillDownData(null);
      } finally {
        setDrillDownLoading(false);
      }
    });
  }, [activeNodeId]);

  const handleNodeClick = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("node", id);
      router.push(`/?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleNodeRightClick = useCallback((id: string, x: number, y: number) => {
    setContextMenu({ entityId: id, x, y });
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#FAFAF7] overflow-hidden">
      <Header
        workspaceName={workspace.name}
        onUpload={() => setUploadOpen(true)}
        onMaterials={() => setMaterialsOpen(true)}
      />
      <TimeframeBar />
      <div className="relative flex-1 overflow-hidden">
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          onNodeClick={handleNodeClick}
          onNodeRightClick={handleNodeRightClick}
        />
        <ZoomControls
          onZoomIn={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "+", bubbles: true }));
          }}
          onZoomOut={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "-", bubbles: true }));
          }}
          onReset={() => {
            window.dispatchEvent(
              new KeyboardEvent("keydown", { key: "0", metaKey: true, bubbles: true }),
            );
          }}
        />
      </div>

      {contextMenu && (
        <NodeContextMenu
          entityId={contextMenu.entityId}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}

      <DrillDownPanel data={drillDownData} loading={drillDownLoading} />

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />

      <MaterialsPanel open={materialsOpen} onClose={() => setMaterialsOpen(false)} />

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
