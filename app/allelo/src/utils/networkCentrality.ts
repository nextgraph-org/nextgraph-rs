import { GraphNode, GraphEdge } from '@/types/network';

export interface CentralityScore {
  nodeId: string;
  score: number;
  normalizedScore: number;
}

export const calculateNetworkCentrality = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  centerNodeId: string
): Map<string, number> => {
  const centralityScores = new Map<string, number>();

  nodes.forEach((node) => {
    centralityScores.set(node.id, 0);
  });

  const nodeConnections = new Map<string, Set<string>>();
  nodes.forEach((node) => {
    nodeConnections.set(node.id, new Set());
  });

  edges.forEach((edge) => {
    const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
    const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;

    nodeConnections.get(sourceId)?.add(targetId);
    nodeConnections.get(targetId)?.add(sourceId);
  });

  nodes.forEach((node) => {
    const connections = nodeConnections.get(node.id)?.size || 0;

    const connectedToCenter = nodeConnections.get(node.id)?.has(centerNodeId);
    const centerBonus = connectedToCenter ? 2 : 0;

    let secondDegreeConnections = 0;
    nodeConnections.get(node.id)?.forEach((connectedId) => {
      secondDegreeConnections += nodeConnections.get(connectedId)?.size || 0;
    });

    const score = connections * 10 + centerBonus + secondDegreeConnections * 0.5;
    centralityScores.set(node.id, score);
  });

  centralityScores.set(centerNodeId, 1000);

  const scores = Array.from(centralityScores.values()).filter((s) => s > 0);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);

  const normalizedScores = new Map<string, number>();
  centralityScores.forEach((score, nodeId) => {
    const normalized = maxScore > minScore ? (score - minScore) / (maxScore - minScore) : 0.5;
    normalizedScores.set(nodeId, normalized);
  });

  return normalizedScores;
};

export const getRadialDistance = (centralityScore: number, maxRadius: number): number => {
  const minRadius = maxRadius * 0.2;
  const usableRadius = maxRadius - minRadius;

  return minRadius + (usableRadius * (1 - centralityScore));
};
