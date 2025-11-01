import { create } from 'zustand';
import { GraphNode, GraphEdge } from '@/types/network';
import { Simulation } from 'd3-force';

interface NetworkGraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  centeredNodeId: string | null;
  viewHistory: string[];
  simulation: Simulation<GraphNode, GraphEdge> | null;

  setNodes: (nodes: GraphNode[]) => void;
  setEdges: (edges: GraphEdge[]) => void;
  centerNode: (nodeId: string) => void;
  goBack: () => void;
  setSimulation: (simulation: Simulation<GraphNode, GraphEdge> | null) => void;
  updateNodePositions: (nodes: GraphNode[]) => void;
}

export const useNetworkGraphStore = create<NetworkGraphState>((set, get) => ({
  nodes: [],
  edges: [],
  centeredNodeId: null,
  viewHistory: [],
  simulation: null,

  setNodes: (nodes) => set({ nodes }),

  setEdges: (edges) => set({ edges }),

  centerNode: (nodeId) => {
    const { centeredNodeId, viewHistory, nodes } = get();

    const updatedNodes = nodes.map((node) => ({
      ...node,
      isCentered: node.id === nodeId,
    }));

    if (nodeId === 'me') {
      set({
        nodes: updatedNodes,
        centeredNodeId: nodeId,
        viewHistory: [],
      });
    } else if (centeredNodeId && centeredNodeId !== nodeId) {
      set({
        nodes: updatedNodes,
        centeredNodeId: nodeId,
        viewHistory: [...viewHistory, centeredNodeId],
      });
    } else {
      set({
        nodes: updatedNodes,
        centeredNodeId: nodeId,
      });
    }
  },

  goBack: () => {
    const { viewHistory } = get();
    if (viewHistory.length > 0) {
      const newHistory = [...viewHistory];
      const previousNodeId = newHistory.pop();
      set({
        centeredNodeId: previousNodeId || null,
        viewHistory: newHistory,
      });
    }
  },

  setSimulation: (simulation) => set({ simulation }),

  updateNodePositions: (updatedNodes) => {
    const { nodes } = get();
    const updatedNodesMap = new Map(updatedNodes.map((n) => [n.id, n]));

    const mergedNodes = nodes.map((node) => {
      const updated = updatedNodesMap.get(node.id);
      if (updated) {
        return {
          ...node,
          x: updated.x,
          y: updated.y,
          vx: updated.vx,
          vy: updated.vy,
          fx: updated.fx,
          fy: updated.fy,
        };
      }
      return node;
    });

    set({ nodes: mergedNodes });
  },
}));
