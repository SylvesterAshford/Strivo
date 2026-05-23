"use client";

import { useState, useCallback } from "react";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { NodeContextMenu } from "@/components/graph/NodeContextMenu";
import { Header } from "@/components/chrome/Header";
import { TimeframeBar } from "@/components/chrome/TimeframeBar";
import { ZoomControls } from "@/components/chrome/ZoomControls";
import { UploadModal } from "@/components/upload/UploadModal";
import type { GraphNode, GraphEdge } from "@/types/graph";

interface Props {
  workspace: { id: string; name: string };
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface ContextMenu {
  entityId: string;
  x: number;
  y: number;
}

export function HomeView({ workspace, nodes, edges }: Props) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const handleNodeRightClick = useCallback((id: string, x: number, y: number) => {
    setContextMenu({ entityId: id, x, y });
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#FAFAF7] overflow-hidden">
      <Header
        workspaceName={workspace.name}
        onUpload={() => setUploadOpen(true)}
      />
      <TimeframeBar />
      <div className="relative flex-1 overflow-hidden">
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          onNodeClick={(_id) => {
            // phase 3: open drill-down panel
          }}
          onNodeRightClick={handleNodeRightClick}
        />
        <ZoomControls
          onZoomIn={() => {
            window.dispatchEvent(
              new KeyboardEvent("keydown", { key: "+", bubbles: true }),
            );
          }}
          onZoomOut={() => {
            window.dispatchEvent(
              new KeyboardEvent("keydown", { key: "-", bubbles: true }),
            );
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

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
