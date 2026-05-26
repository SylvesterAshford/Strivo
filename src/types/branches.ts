export interface CommitData {
  id: string;
  branchId: string;
  t: number;
  kind: "present" | "event" | "decision" | "terminus";
  description: string;
  affectedEntityIds: string[];
  projectedEntities: Array<{ name: string; kind: string; id: string }>;
  projectedEdges: Array<{ from: string; to: string; kind: string }>;
  orderIndex: number;
}

export interface BranchData {
  id: string;
  workspaceId: string;
  name: string;
  parentBranchId: string | null;
  valence: "main" | "favorable" | "neutral" | "contested" | "adverse";
  probability: number;
  description: string;
  triggerEvent: string | null;
  divergeAt: number;
  divergeY: number;
  origin: "system" | "user" | "simulation";
  involvedEntityIds: string[];
  commits: CommitData[];
}
