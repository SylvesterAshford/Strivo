export interface GraphNode {
  id: string;
  name: string;
  kind: string;
  summary: string | null;
  positionX: number | null;
  positionY: number | null;
  connectionCount: number;
  hidden: boolean;
}

export interface GraphEdge {
  id: string;
  fromId: string;
  toId: string;
  kind: "quiet" | "active" | "strong" | "tension";
  weight: number;
}
