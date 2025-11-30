import { create } from 'zustand';
import { GraphNode, GraphEdge } from '@/types/network';
import { Simulation } from 'd3-force';

interface NetworkGraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  centeredNodeId: string | null;
  viewHistory: string[];
  simulation: Simulation<GraphNode, GraphEdge> | null;
  centralityRangeMin: number;
  centralityRangeMax: number;
  zoomLevel: number;

  setNodes: (nodes: GraphNode[]) => void;
  setEdges: (edges: GraphEdge[]) => void;
  centerNode: (nodeId: string) => void;
  goBack: () => void;
  setSimulation: (simulation: Simulation<GraphNode, GraphEdge> | null) => void;
  updateNodePositions: (nodes: GraphNode[]) => void;
  increaseCentrality: () => void;
  decreaseCentrality: () => void;
  resetCentrality: () => void;
  canIncreaseCentrality: () => boolean;
  canDecreaseCentrality: () => boolean;
  setZoomLevel: (level: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export const useNetworkGraphStore = create<NetworkGraphState>((set, get) => ({
  nodes: [],
  edges: [],
  centeredNodeId: null,
  viewHistory: [],
  simulation: null,
  centralityRangeMin: 0.9,
  centralityRangeMax: 1.0,
  zoomLevel: 1,

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

  increaseCentrality: () => {
    const { centralityRangeMin } = get();
    if (centralityRangeMin < 0.9) {
      const newMin = Math.min(0.9, centralityRangeMin + 0.1);
      const newMax = newMin + 0.1;
      set({ centralityRangeMin: newMin, centralityRangeMax: newMax });
    }
  },

  decreaseCentrality: () => {
    const { centralityRangeMin } = get();
    if (centralityRangeMin > 0) {
      const newMin = Math.max(0, centralityRangeMin - 0.1);
      const newMax = newMin + 0.1;
      set({ centralityRangeMin: newMin, centralityRangeMax: newMax });
    }
  },

  resetCentrality: () => {
    set({ centralityRangeMin: 0, centralityRangeMax: 1 });
  },

  canIncreaseCentrality: () => {
    const { centralityRangeMin } = get();
    return centralityRangeMin < 0.9;
  },

  canDecreaseCentrality: () => {
    const { centralityRangeMin } = get();
    return centralityRangeMin > 0;
  },

  setZoomLevel: (level) => set({ zoomLevel: Math.max(0.1, Math.min(3, level)) }),

  zoomIn: () => {
    const { zoomLevel } = get();
    set({ zoomLevel: Math.min(3, zoomLevel * 1.2) });
  },

  zoomOut: () => {
    const { zoomLevel } = get();
    set({ zoomLevel: Math.max(0.1, zoomLevel / 1.2) });
  },
}));
