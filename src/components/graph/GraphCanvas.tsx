"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
  SimulationNodeDatum,
  SimulationLinkDatum,
} from "d3-force";
import type { GraphNode, GraphEdge } from "@/types/graph";
import type { CommitData } from "@/types/branches";

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (id: string) => void;
  onNodeRightClick?: (id: string, x: number, y: number) => void;
  // Hypothetical mode
  involvedSet?: Set<string> | null;
  projectedEntities?: Array<{ name: string; kind: string; id: string }>;
  hypothetical?: boolean;
  // Play controllers
  playHistoryCutoff?: Date | null;
  playForwardCutoff?: number | null;
  mainCommits?: CommitData[];
}

interface SimNode extends GraphNode, SimulationNodeDatum {
  x: number;
  y: number;
}

type SimLink = SimulationLinkDatum<SimNode> & {
  id: string;
  kind: GraphEdge["kind"];
  weight: number;
};

const KIND_COLORS: Record<string, string> = {
  person: "#44679E",
  organization: "#1F4D7A",
  company: "#2D7A57",
  product: "#6A4B96",
  event: "#8B4E1F",
  policy: "#6E5E2E",
  place: "#5C5A52",
  concept: "#8C8980",
  you: "#C9512D",
  default: "#6B675D",
};

export function GraphCanvas({
  nodes,
  edges,
  onNodeClick,
  onNodeRightClick,
  involvedSet,
  projectedEntities = [],
  hypothetical = false,
  playHistoryCutoff,
  playForwardCutoff,
  mainCommits = [],
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [pan, setPan] = useState<{ ox: number; oy: number } | null>(null);
  const [pulsing, setPulsing] = useState<Set<string>>(new Set());
  const prevForwardCutoff = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (svgRef.current) {
      const { width, height } = svgRef.current.getBoundingClientRect();
      setView({ x: width / 2, y: height / 2, k: 1 });
    }
  }, []);

  useEffect(() => {
    if (nodes.length === 0) {
      setSimNodes([]);
      return;
    }

    const simNodesCopy: SimNode[] = nodes.map((n) => ({
      ...n,
      x: n.positionX ?? (Math.random() - 0.5) * 400,
      y: n.positionY ?? (Math.random() - 0.5) * 400,
    }));

    const nodeById = new Map(simNodesCopy.map((n) => [n.id, n]));

    const simLinks: SimLink[] = edges
      .filter((e) => nodeById.has(e.fromId) && nodeById.has(e.toId))
      .map((e) => ({
        source: nodeById.get(e.fromId)!,
        target: nodeById.get(e.toId)!,
        id: e.id,
        kind: e.kind,
        weight: e.weight,
      }));

    const sim = forceSimulation<SimNode>(simNodesCopy)
      .force("charge", forceManyBody<SimNode>().strength(-280))
      .force(
        "link",
        forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(80),
      )
      .force("center", forceCenter(0, 0))
      .force(
        "collide",
        forceCollide<SimNode>().radius((d) => 12 + Math.min(d.connectionCount, 8)),
      );

    simNodesCopy.forEach((n) => {
      if (n.positionX !== null && n.positionY !== null) {
        n.fx = n.positionX;
        n.fy = n.positionY;
      }
    });

    sim.on("tick", () => {
      setSimNodes([...simNodesCopy]);
    });

    setTimeout(() => sim.stop(), 4000);

    return () => { sim.stop(); };
  }, [nodes, edges]);

  // Pulse entities when play-forward cutoff passes a main commit
  useEffect(() => {
    if (playForwardCutoff == null) {
      prevForwardCutoff.current = null;
      return;
    }
    const prev = prevForwardCutoff.current ?? 0;
    prevForwardCutoff.current = playForwardCutoff;

    const justPassed = mainCommits.filter(
      (c) => c.t > prev && c.t <= playForwardCutoff,
    );
    if (justPassed.length === 0) return;

    const ids = new Set(justPassed.flatMap((c) => c.affectedEntityIds));
    if (ids.size === 0) return;

    setPulsing(ids);
    const timer = setTimeout(() => setPulsing(new Set()), 600);
    return () => clearTimeout(timer);
  }, [playForwardCutoff, mainCommits]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    setView((v) => ({ ...v, k: Math.max(0.3, Math.min(3, v.k * factor)) }));
  }, []);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest(".node-hit")) return;
    setPan({ ox: e.clientX - view.x, oy: e.clientY - view.y });
  };
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (pan) setView((v) => ({ ...v, x: e.clientX - pan.ox, y: e.clientY - pan.oy }));
  };
  const handleMouseUp = () => setPan(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const speed = e.shiftKey ? 100 : 30;
      if (e.key === "ArrowUp") setView((v) => ({ ...v, y: v.y + speed }));
      if (e.key === "ArrowDown") setView((v) => ({ ...v, y: v.y - speed }));
      if (e.key === "ArrowLeft") setView((v) => ({ ...v, x: v.x + speed }));
      if (e.key === "ArrowRight") setView((v) => ({ ...v, x: v.x - speed }));
      if (e.key === "+" || e.key === "=")
        setView((v) => ({ ...v, k: Math.min(3, v.k * (e.shiftKey ? 1.4 : 1.2)) }));
      if (e.key === "-" || e.key === "_")
        setView((v) => ({ ...v, k: Math.max(0.3, v.k / (e.shiftKey ? 1.4 : 1.2)) }));
      if ((e.key === "0") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (svgRef.current) {
          const { width, height } = svgRef.current.getBoundingClientRect();
          setView({ x: width / 2, y: height / 2, k: 1 });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const connectedIds = (() => {
    if (!hoveredId) return null;
    const set = new Set<string>([hoveredId]);
    edges.forEach((e) => {
      if (e.fromId === hoveredId) set.add(e.toId);
      if (e.toId === hoveredId) set.add(e.fromId);
    });
    return set;
  })();

  const byId = new Map(simNodes.map((n) => [n.id, n]));

  // Nodes visible in play-history mode
  const visibleNodeIds = playHistoryCutoff
    ? new Set(simNodes.filter((n) => n.firstSeenAt <= playHistoryCutoff).map((n) => n.id))
    : null;

  const visibleEdgeIds = playHistoryCutoff
    ? new Set(edges.filter((e) => e.validFrom <= playHistoryCutoff).map((e) => e.id))
    : null;

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: pan ? "grabbing" : "default", background: "transparent" }}
    >
      <g transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}>
        {edges.map((edge) => {
          if (visibleEdgeIds && !visibleEdgeIds.has(edge.id)) return null;

          const from = byId.get(edge.fromId);
          const to = byId.get(edge.toId);
          if (!from || !to) return null;

          const isConnected =
            connectedIds &&
            connectedIds.has(edge.fromId) &&
            connectedIds.has(edge.toId);

          // Hypothetical mode: dim edges where at least one endpoint is uninvolved
          const bothInvolved =
            !hypothetical ||
            !involvedSet ||
            (involvedSet.has(edge.fromId) && involvedSet.has(edge.toId));

          const baseOpacity = !connectedIds ? 0.6 : isConnected ? 1 : 0.15;
          const opacity = hypothetical && !bothInvolved ? 0.25 : baseOpacity;

          const stroke =
            edge.kind === "active"
              ? "#C9512D"
              : edge.kind === "strong"
              ? "#1F4D7A"
              : "#DDDAD0";
          const strokeWidth =
            edge.kind === "active" ? 1.5 : edge.kind === "strong" ? 1.2 : 0.5;

          return (
            <line
              key={edge.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={stroke}
              strokeWidth={strokeWidth}
              opacity={opacity}
            />
          );
        })}

        {simNodes.map((node) => {
          if (node.hidden) return null;
          if (visibleNodeIds && !visibleNodeIds.has(node.id)) return null;

          const isInvolved = involvedSet?.has(node.id) ?? false;
          const isUserNode = node.kind === "you";
          const isPulsing = pulsing.has(node.id);

          const baseRadius = 6 + Math.min(node.connectionCount, 12) * 1.2;
          const visualRadius = !hypothetical
            ? baseRadius
            : (isInvolved ? baseRadius + 1 : (isUserNode ? baseRadius : Math.max(3, baseRadius - 1)));

          const visualOpacity = !hypothetical
            ? 1
            : (isInvolved || isUserNode) ? 1 : 0.35;

          const fill = KIND_COLORS[node.kind] ?? KIND_COLORS.default;
          const isHovered = hoveredId === node.id;
          const hoverDim = connectedIds && !connectedIds.has(node.id) ? 0.35 : 1;
          const finalOpacity = visualOpacity * hoverDim;

          return (
            <g key={node.id} opacity={finalOpacity} style={{ transition: "opacity 120ms" }}>
              <circle
                cx={node.x}
                cy={node.y}
                r={isPulsing ? visualRadius * 1.6 : visualRadius}
                fill={fill}
                style={{ transition: isPulsing ? "r 100ms ease-out" : "r 400ms ease-out" }}
              />
              {hypothetical && isInvolved && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={visualRadius + 3}
                  fill="none"
                  stroke={fill}
                  strokeWidth={1.2}
                  opacity={0.5}
                  style={{ pointerEvents: "none" }}
                />
              )}
              {isHovered && (
                <text
                  x={node.x}
                  y={node.y + visualRadius + 14}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#111110"
                  fontFamily="Inter, sans-serif"
                  style={{ pointerEvents: "none" }}
                >
                  {node.name}
                </text>
              )}
              <circle
                className="node-hit"
                cx={node.x}
                cy={node.y}
                r={visualRadius + 8}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() =>
                  setHoveredId((h) => (h === node.id ? null : h))
                }
                onClick={() => onNodeClick?.(node.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onNodeRightClick?.(node.id, e.clientX, e.clientY);
                }}
              />
            </g>
          );
        })}

        {projectedEntities.map((pe, i) => {
          const angle = (i / Math.max(projectedEntities.length, 1)) * Math.PI * 2;
          const r = 180 + (i % 3) * 40;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          const fill = KIND_COLORS[pe.kind] ?? KIND_COLORS.default;

          return (
            <g key={pe.id} opacity={0.85}>
              <circle
                cx={x}
                cy={y}
                r={5}
                fill={fill}
              />
              <circle
                cx={x}
                cy={y}
                r={8}
                fill="none"
                stroke="#C9512D"
                strokeWidth={1.2}
                strokeDasharray="3 2"
                opacity={0.7}
                style={{ pointerEvents: "none" }}
              />
              <text
                x={x}
                y={y + 18}
                textAnchor="middle"
                fontSize={9}
                fill="#6B675D"
                fontFamily="Inter, sans-serif"
                style={{ pointerEvents: "none" }}
              >
                {pe.name}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
